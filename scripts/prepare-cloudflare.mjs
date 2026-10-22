import { cpSync, mkdirSync, readFileSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const output = 'outputs/cloudflare';
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync('dist/server', output, { recursive: true });
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else yield file;
  }
}
const mime = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.html': 'text/html; charset=utf-8',
};
const assets = {};
for (const file of walk('dist/client')) {
  const path = '/' + relative('dist/client', file).replaceAll('\\', '/');
  if (path.includes('responsive-check') || path.includes('/.vite/')) continue;
  const ext = file.slice(file.lastIndexOf('.'));
  assets[path] = {
    body: readFileSync(file).toString('base64'),
    type: mime[ext] || 'application/octet-stream',
  };
}
writeFileSync(output + '/noteflow-assets.js', 'export default ' + JSON.stringify(assets) + ';\n');
writeFileSync(
  output + '/entry.js',
  `import app from './index.js';
import assets from './noteflow-assets.js';
export default {async fetch(request,env,ctx){
 const pathname=new URL(request.url).pathname;
 const asset=assets[pathname];
 if(asset&&(request.method==='GET'||request.method==='HEAD')){
  const headers={'Content-Type':asset.type,'Cache-Control':pathname.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'public, max-age=86400','X-Content-Type-Options':'nosniff'};
  const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers});
 }
 return app.fetch(request,env,ctx);
}};`,
);
const config = {
  name: 'noteflow',
  main: 'entry.js',
  no_bundle: true,
  compatibility_date: '2026-10-22',
  compatibility_flags: ['nodejs_compat'],
  workers_dev: true,
  observability: { enabled: true },
  rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'noteflow-production',
      database_id: '4a3658d6-ee2d-4afd-a5f6-ae13096a1aff',
      migrations_dir: '../../drizzle',
    },
  ],
};
writeFileSync(output + '/wrangler.json', JSON.stringify(config, null, 2));
console.log(
  `Cloudflare artifact prepared: ${Object.keys(assets).length} assets. Deploy with pnpm exec wrangler deploy --config ${output}/wrangler.json`,
);
