import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleApi } from '../server/api.ts';
// Runs the real parameterized SQL against SQLite, using the D1 subset used by the API.
class SqliteD1 {
  sqlite = new DatabaseSync(':memory:');
  constructor() {
    this.sqlite.exec('PRAGMA foreign_keys=ON');
    for (const f of readdirSync('drizzle')
      .filter((f) => f.endsWith('.sql'))
      .sort())
      this.sqlite.exec(readFileSync('drizzle/' + f, 'utf8'));
  }
  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    let values: (string | number | null)[] = [];
    const adapter = {
      bind(...args: (string | number | null)[]) {
        values = args;
        return adapter;
      },
      async first() {
        return statement.get(...values) ?? null;
      },
      async all() {
        return { results: statement.all(...values) };
      },
      async run() {
        return statement.run(...values);
      },
    };
    return adapter;
  }
  async batch(statements: { run: () => Promise<unknown> }[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const s of statements) results.push(await s.run());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (e) {
      this.sqlite.exec('ROLLBACK');
      throw e;
    }
  }
}
let db: SqliteD1;
beforeEach(() => {
  db = new SqliteD1();
});
const body = {
  title: 'A useful thought',
  content: 'Private words',
  tags: ['Dev'],
  archived: false,
};
async function call(
  path: string,
  method = 'GET',
  data?: unknown,
  cookie = '',
  origin = 'https://app.test',
) {
  return handleApi(
    new Request('https://app.test' + path, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
    db as unknown as D1Database,
  );
}
async function session() {
  const r = await call('/api/workspace', 'POST', {});
  assert.equal(r.status, 200);
  return r.headers.get('Set-Cookie')!.split(';')[0];
}
async function create(cookie: string) {
  const r = await call('/api/notes', 'POST', body, cookie);
  assert.equal(r.status, 201);
  return ((await r.json()) as { note: { id: string; version: number } }).note;
}
test('creates a secure isolated workspace and seeds notes only once', async () => {
  const r = await call('/api/workspace', 'POST', {});
  assert.match(r.headers.get('Set-Cookie')!, /HttpOnly; SameSite=Strict/);
  assert.match(r.headers.get('Set-Cookie')!, /Secure/);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const cookie = r.headers.get('Set-Cookie')!.split(';')[0];
  const first = (await r.json()) as { notes: unknown[] };
  const second = (await (await call('/api/workspace', 'POST', {}, cookie)).json()) as {
    notes: unknown[];
  };
  assert.equal(first.notes.length, 9);
  assert.equal(second.notes.length, 9);
});
test('requires an existing session for notes', async () => {
  assert.equal((await call('/api/notes')).status, 401);
});
test('creates, edits, archives, restores and deletes a note', async () => {
  const cookie = await session(),
    note = await create(cookie);
  let version = note.version;
  for (const archived of [false, true, false]) {
    const r = await call(
      '/api/notes/' + note.id,
      'PUT',
      { ...body, title: 'Edited', archived, version },
      cookie,
    );
    assert.equal(r.status, 200);
    const result = (await r.json()) as {
      note: { version: number; archived: boolean; title: string };
    };
    assert.equal(result.note.archived, archived);
    assert.equal(result.note.title, 'Edited');
    version = result.note.version;
  }
  assert.equal((await call('/api/notes/' + note.id, 'DELETE', { version }, cookie)).status, 200);
  assert.equal(
    (await call('/api/notes/' + note.id, 'PUT', { ...body, version }, cookie)).status,
    404,
  );
});
test('prevents reading, modifying or deleting another workspace’s notes', async () => {
  const a = await session(),
    b = await session(),
    note = await create(a);
  const result = (await (await call('/api/notes', 'GET', undefined, b)).json()) as {
    notes: { id: string }[];
  };
  assert.equal(
    result.notes.some((n) => n.id === note.id),
    false,
  );
  assert.equal(
    (await call('/api/notes/' + note.id, 'PUT', { ...body, version: 1 }, b)).status,
    404,
  );
  assert.equal((await call('/api/notes/' + note.id, 'DELETE', { version: 1 }, b)).status, 404);
});
test('rejects stale writes and stale deletions', async () => {
  const cookie = await session(),
    note = await create(cookie);
  assert.equal(
    (await call('/api/notes/' + note.id, 'PUT', { ...body, version: 1 }, cookie)).status,
    200,
  );
  assert.equal(
    (await call('/api/notes/' + note.id, 'PUT', { ...body, version: 1 }, cookie)).status,
    409,
  );
  assert.equal((await call('/api/notes/' + note.id, 'DELETE', { version: 1 }, cookie)).status, 409);
});
test('rejects invalid data without touching the database', async () => {
  const cookie = await session();
  assert.equal((await call('/api/notes', 'POST', { ...body, title: ' ' }, cookie)).status, 422);
  assert.equal(
    (await call('/api/notes', 'POST', { ...body, owner: 'forged' }, cookie)).status,
    422,
  );
  assert.equal((await call('/api/notes', 'POST', body, cookie, 'https://evil.test')).status, 403);
});
test('preserves script-like content as text and handles quoted titles', async () => {
  const cookie = await session();
  const r = await call(
    '/api/notes',
    'POST',
    { ...body, title: "Robert'); DROP TABLE notes;--", content: '<script>alert(1)</script>' },
    cookie,
  );
  assert.equal(r.status, 201);
  const result = (await r.json()) as { note: { content: string } };
  assert.equal(result.note.content, '<script>alert(1)</script>');
  assert.equal((await call('/api/notes', 'GET', undefined, cookie)).status, 200);
});
test('enforces workspace write/read rate limits', async () => {
  const cookie = await session();
  for (let i = 0; i < 179; i++)
    assert.equal((await call('/api/notes', 'GET', undefined, cookie)).status, 200);
  assert.equal((await call('/api/notes', 'GET', undefined, cookie)).status, 429);
});
test('enforces the 500 note limit atomically', async () => {
  const cookie = await session();
  const owner = (db.sqlite.prepare('SELECT id FROM workspaces').get() as { id: string }).id;
  const insert = db.sqlite.prepare(
    'INSERT INTO notes(id,owner,title,content,tags,archived,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,1)',
  );
  for (let i = 9; i < 500; i++)
    insert.run(crypto.randomUUID(), owner, 'Note', '', '[]', 0, '2026-01-01', '2026-01-01');
  assert.equal((await call('/api/notes', 'POST', body, cookie)).status, 409);
});
