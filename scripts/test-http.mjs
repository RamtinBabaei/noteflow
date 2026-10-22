import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
let checks = 0;
const verify = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log('PASS', message);
};
async function call(path, method = 'GET', body, cookie = '', origin = base) {
  const r = await fetch(base + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return { r, data };
}
const { r: health, data: healthBody } = await call('/api/health');
verify(health.ok && healthBody.database === 'connected', 'real database connection');
const { r: session, data: workspace } = await call('/api/workspace', 'POST', {});
verify(session.ok && workspace.notes.length === 9, 'workspace creation and seed');
const cookie = session.headers.get('set-cookie').split(';')[0];
verify(session.headers.get('cache-control') === 'no-store', 'private responses are never cached');
verify(session.headers.get('set-cookie').includes('HttpOnly'), 'session cookie is HttpOnly');
const note = {
  title: 'HTTP integration ' + crypto.randomUUID(),
  content: 'مرحبا — a complete journey',
  tags: ['Integration'],
  archived: false,
};
const created = await call('/api/notes', 'POST', note, cookie);
verify(created.r.status === 201, 'create note');
const id = created.data.note.id;
let version = 1;
const listed = await call('/api/notes', 'GET', undefined, cookie);
verify(
  listed.data.notes.some((n) => n.id === id),
  'read created note',
);
const other = await call('/api/workspace', 'POST', {});
const otherCookie = other.r.headers.get('set-cookie').split(';')[0];
verify(
  !(await call('/api/notes', 'GET', undefined, otherCookie)).data.notes.some((n) => n.id === id),
  'second session cannot read first session note',
);
verify(
  (await call('/api/notes/' + id, 'PUT', { ...note, version }, otherCookie)).r.status === 404,
  'cross-session edit blocked',
);
for (const archived of [false, true, false]) {
  const updated = await call(
    '/api/notes/' + id,
    'PUT',
    { ...note, title: 'Updated integration note', archived, version },
    cookie,
  );
  verify(
    updated.r.status === 200 && updated.data.note.archived === archived,
    'update/archive/restore ' + version,
  );
  version = updated.data.note.version;
}
verify(
  (await call('/api/notes/' + id, 'PUT', { ...note, version: 1 }, cookie)).r.status === 409,
  'concurrent stale edit blocked',
);
verify(
  (await call('/api/notes', 'POST', { ...note, title: '' }, cookie)).r.status === 422,
  'required title validation',
);
verify(
  (await call('/api/notes', 'POST', note, cookie, 'https://untrusted.example')).r.status === 403,
  'cross-origin mutation blocked',
);
verify(
  (await call('/api/notes/' + id, 'DELETE', { version: 1 }, cookie)).r.status === 409,
  'stale deletion blocked',
);
verify((await call('/api/notes/' + id, 'DELETE', { version }, cookie)).r.ok, 'delete created note');
verify(
  !(await call('/api/notes', 'GET', undefined, cookie)).data.notes.some((n) => n.id === id),
  'deletion persists',
);
verify((await call('/api/notes')).r.status === 401, 'unauthenticated note access blocked');
console.log(`${checks} HTTP checks passed against ${base}`);
