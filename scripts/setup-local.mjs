import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const run = (args) => {
  const p = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (p.status !== 0) process.exit(p.status ?? 1);
};
run(['scripts/run-framework.mjs', 'build']);
const args = [
  '--import',
  './scripts/sites-env.mjs',
  './node_modules/wrangler/bin/wrangler.js',
  'd1',
  'execute',
  'DB',
  '--local',
  '--config',
  'dist/server/wrangler.json',
  '--persist-to',
  '.wrangler/state',
];
run([
  ...args,
  '--command',
  'CREATE TABLE IF NOT EXISTS noteflow_migrations (name TEXT PRIMARY KEY)',
]);
const check = spawnSync(
  process.execPath,
  [...args, '--command', 'SELECT name FROM noteflow_migrations', '--json'],
  { encoding: 'utf8' },
);
if (check.status !== 0) {
  console.error(check.stderr);
  process.exit(1);
}
const existing = JSON.parse(check.stdout).flatMap((r) => r.results.map((row) => row.name));
for (const name of readdirSync('drizzle')
  .filter((s) => s.endsWith('.sql'))
  .sort()) {
  if (existing.includes(name)) continue;
  run([...args, '--file', `drizzle/${name}`]);
  run([
    ...args,
    '--command',
    `INSERT INTO noteflow_migrations (name) VALUES ('${name.replaceAll("'", "''")}')`,
  ]);
}
console.log('Local database is ready. Run pnpm dev and open http://localhost:5173');
