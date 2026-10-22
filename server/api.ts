import { noteInput, noteUpdate, type Note } from '../features/notes/model.ts';
import { seedNotes } from '../features/notes/seeds.ts';
import { assertMutation, digest, HttpError, readBody, tokenFromCookie } from './security.ts';
interface Row {
  id: string;
  title: string;
  content: string;
  tags: string;
  archived: number;
  created_at: string;
  updated_at: string;
  version: number;
}
const toNote = (r: Row): Note => ({
  id: r.id,
  title: r.title,
  content: r.content,
  tags: JSON.parse(r.tags),
  archived: !!r.archived,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  version: r.version,
});
async function rateLimit(db: D1Database, key: string, max: number, seconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const id = key + ':' + Math.floor(now / seconds);
  const row = await db
    .prepare(
      'INSERT INTO rate_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',
    )
    .bind(id, now + seconds)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new HttpError(429, 'A few too many requests. Please try again in a minute.');
}
export async function handleApi(request: Request, db: D1Database): Promise<Response> {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  try {
    assertMutation(request);
    const path = new URL(request.url).pathname;
    if (path === '/api/health' && request.method === 'GET') {
      await db.prepare('SELECT 1').first();
      return json({ status: 'ok', database: 'connected' });
    }
    let token = tokenFromCookie(request.headers.get('cookie'));
    let owner = token ? await digest(token) : null;
    const workspace = owner
      ? await db
          .prepare('SELECT id FROM workspaces WHERE id=? AND expires_at>?')
          .bind(owner, Date.now())
          .first()
      : null;
    if (!workspace) {
      if (path !== '/api/workspace' || request.method !== 'POST')
        throw new HttpError(401, 'Your workspace session has expired. Reload the app.');
      const ip = await digest(request.headers.get('cf-connecting-ip') || 'local');
      await rateLimit(db, 'session:' + ip, 30, 3600);
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      owner = await digest(token);
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare('INSERT INTO workspaces (id,created_at,expires_at) VALUES (?,?,?)')
          .bind(owner, now, Date.now() + 90 * 86400000),
        ...seedNotes.map((n) =>
          db
            .prepare(
              'INSERT INTO notes (id,owner,title,content,tags,archived,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,1)',
            )
            .bind(
              crypto.randomUUID(),
              owner,
              n.title,
              n.content,
              JSON.stringify(n.tags),
              +n.archived,
              n.date,
              n.date,
            ),
        ),
      ]);
      headers.set(
        'Set-Cookie',
        `noteflow_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7776000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
      );
      // Bounded housekeeping: workspace deletion cascades to its notes.
      await db.batch([
        db
          .prepare(
            'DELETE FROM rate_limits WHERE id IN (SELECT id FROM rate_limits WHERE expires<? LIMIT 100)',
          )
          .bind(Math.floor(Date.now() / 1000)),
        db
          .prepare(
            'DELETE FROM workspaces WHERE id IN (SELECT id FROM workspaces WHERE expires_at<? LIMIT 10)',
          )
          .bind(Date.now()),
      ]);
    }
    if (!owner) throw new HttpError(401, 'Workspace unavailable.');
    await rateLimit(db, 'workspace:' + owner, 180, 60);
    if (
      (path === '/api/workspace' && request.method === 'POST') ||
      (path === '/api/notes' && request.method === 'GET')
    ) {
      const result = await db
        .prepare(
          'SELECT id,title,content,tags,archived,created_at,updated_at,version FROM notes WHERE owner=? ORDER BY updated_at DESC LIMIT 500',
        )
        .bind(owner)
        .all<Row>();
      return json({ notes: result.results.map(toNote) });
    }
    if (path === '/api/notes' && request.method === 'POST') {
      const parsed = noteInput.safeParse(await readBody(request));
      if (!parsed.success) throw new HttpError(422, parsed.error.issues[0].message);
      const n = parsed.data;
      const id = crypto.randomUUID(),
        now = new Date().toISOString();
      const result = await db
        .prepare(
          'INSERT INTO notes (id,owner,title,content,tags,archived,created_at,updated_at,version) SELECT ?,?,?,?,?,?,?,?,1 WHERE (SELECT COUNT(*) FROM notes WHERE owner=?)<500 RETURNING *',
        )
        .bind(id, owner, n.title, n.content, JSON.stringify(n.tags), +n.archived, now, now, owner)
        .first<Row>();
      if (!result)
        throw new HttpError(
          409,
          'Your workspace has reached 500 notes. Export or remove some notes first.',
        );
      return json({ note: toNote(result) }, 201);
    }
    const match = path.match(/^\/api\/notes\/([a-f0-9-]{36})$/);
    if (match && request.method === 'PUT') {
      const parsed = noteUpdate.safeParse(await readBody(request));
      if (!parsed.success) throw new HttpError(422, parsed.error.issues[0].message);
      const n = parsed.data;
      const row = await db
        .prepare(
          'UPDATE notes SET title=?,content=?,tags=?,archived=?,updated_at=?,version=version+1 WHERE id=? AND owner=? AND version=? RETURNING *',
        )
        .bind(
          n.title,
          n.content,
          JSON.stringify(n.tags),
          +n.archived,
          new Date().toISOString(),
          match[1],
          owner,
          n.version,
        )
        .first<Row>();
      if (!row) {
        const found = await db
          .prepare('SELECT id FROM notes WHERE id=? AND owner=?')
          .bind(match[1], owner)
          .first();
        throw new HttpError(
          found ? 409 : 404,
          found
            ? 'This note changed in another tab. Copy your edits, then reload to get the latest version.'
            : 'This note could not be found.',
        );
      }
      return json({ note: toNote(row) });
    }
    if (match && request.method === 'DELETE') {
      const body = (await readBody(request)) as { version?: unknown };
      if (!body || !Number.isInteger(body.version))
        throw new HttpError(422, 'A note version is required.');
      const result = await db
        .prepare('DELETE FROM notes WHERE id=? AND owner=? AND version=? RETURNING id')
        .bind(match[1], owner, body.version)
        .first();
      if (!result) {
        const exists = await db
          .prepare('SELECT id FROM notes WHERE id=? AND owner=?')
          .bind(match[1], owner)
          .first();
        throw new HttpError(
          exists ? 409 : 404,
          exists
            ? 'This note changed. Reload before deleting it.'
            : 'This note could not be found.',
        );
      }
      return json({ deleted: true });
    }
    throw new HttpError(404, 'This endpoint does not exist.');
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 429) headers.set('Retry-After', '60');
      return json({ error: error.message }, error.status);
    }
    console.error('API operation failed', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'We could not complete that request. Please try again.' }, 500);
  }
}
