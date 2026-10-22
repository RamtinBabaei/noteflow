import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allTags,
  filterNotes,
  noteInput,
  parseTags,
  wordCount,
  type Note,
} from '../features/notes/model.ts';
import {
  assertMutation,
  digest,
  HttpError,
  readBody,
  tokenFromCookie,
} from '../server/security.ts';
const base: Note = {
  id: 'a',
  title: 'React ideas',
  content: 'Make rendering faster',
  tags: ['Dev'],
  archived: false,
  version: 1,
  createdAt: '2026-10-01',
  updatedAt: '2026-10-02',
};
const archived = {
  ...base,
  id: 'b',
  title: 'Travel',
  content: 'Kyoto ideas',
  tags: ['Japan'],
  archived: true,
};
test('requires a nonblank title and limits long notes', () => {
  assert.equal(noteInput.safeParse({ ...base, title: ' ' }).success, false);
  assert.equal(
    noteInput.safeParse({ title: 'ok', content: 'x'.repeat(50001), tags: [] }).success,
    false,
  );
});
test('normalizes duplicate tags and trims the title', () => {
  const parsed = noteInput.parse({ title: ' Idea ', content: '', tags: [' Dev ', 'dev', 'React'] });
  assert.equal(parsed.title, 'Idea');
  assert.deepEqual(parsed.tags, ['dev', 'React']);
});
test('rejects unknown fields, oversized tags, and too many tags', () => {
  assert.equal(
    noteInput.safeParse({ title: 'A', content: '', tags: [], owner: 'someone-else' }).success,
    false,
  );
  assert.equal(
    noteInput.safeParse({ title: 'A', content: '', tags: ['x'.repeat(25)] }).success,
    false,
  );
  assert.equal(
    noteInput.safeParse({ title: 'A', content: '', tags: Array(13).fill('x') }).success,
    false,
  );
});
test('searches title, body and tag case insensitively including archive', () => {
  for (const q of ['react', 'RENDERING', 'dev'])
    assert.equal(filterNotes([base, archived], 'search', '', q).length, 1);
  assert.equal(filterNotes([base, archived], 'search', '', 'japan')[0].id, 'b');
});
test('keeps archives separate and filters by exact tag', () => {
  assert.equal(filterNotes([base, archived], 'all', '', '').length, 1);
  assert.equal(filterNotes([base, archived], 'archive', '', '')[0].id, 'b');
  assert.equal(filterNotes([base], 'tag', 'dev', '').length, 1);
  assert.equal(filterNotes([base], 'tag', 'de', '').length, 0);
});
test('returns active tags and counts Unicode words', () => {
  assert.deepEqual(allTags([base, archived]), ['Dev']);
  assert.equal(wordCount('  سلام دنیا\nhello  '), 3);
  assert.equal(wordCount('  '), 0);
  assert.deepEqual(parseTags(' Dev, React,  ,'), ['Dev', 'React']);
});
test('extracts only valid session cookies', () => {
  const token = 'a'.repeat(64);
  assert.equal(tokenFromCookie('x=y; noteflow_session=' + token), token);
  assert.equal(tokenFromCookie('noteflow_session=bad'), null);
  assert.equal(tokenFromCookie('othernoteflow_session=' + token), null);
});
test('hashes session tokens deterministically', async () => {
  const a = await digest('token');
  assert.equal(a.length, 64);
  assert.equal(a, await digest('token'));
  assert.notEqual(a, await digest('different'));
});
test('blocks cross-origin and non-JSON mutations', () => {
  assert.throws(
    () =>
      assertMutation(
        new Request('https://app.test/api/notes', {
          method: 'POST',
          headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' },
        }),
      ),
    HttpError,
  );
  assert.throws(
    () =>
      assertMutation(
        new Request('https://app.test/api/notes', {
          method: 'POST',
          headers: { Origin: 'https://app.test', 'Content-Type': 'text/plain' },
        }),
      ),
    HttpError,
  );
  assert.doesNotThrow(() => assertMutation(new Request('https://app.test/api/notes')));
});
test('reads bounded JSON and rejects malformed or oversized payloads', async () => {
  assert.deepEqual(
    await readBody(new Request('https://app.test', { method: 'POST', body: '{"a":1}' })),
    { a: 1 },
  );
  await assert.rejects(
    () => readBody(new Request('https://app.test', { method: 'POST', body: '{' })),
    HttpError,
  );
  await assert.rejects(
    () => readBody(new Request('https://app.test', { method: 'POST', body: 'x'.repeat(220001) })),
    HttpError,
  );
});
