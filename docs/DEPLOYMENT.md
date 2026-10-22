# Deploy to Cloudflare

The live deployment is a public Cloudflare Worker backed by its own D1 database. The source repository also includes a private Sites hosting identity for continued editing in ChatGPT Work.

## Deploy this existing project

1. Install dependencies, run checks, and build:

   ```sh
   pnpm install --frozen-lockfile
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   pnpm prepare:cloudflare
   ```

2. Authenticate with Cloudflare on your own machine:

   ```sh
   pnpm exec wrangler login
   ```

3. Apply pending database migrations before publishing code that needs them. The initial production schema is already applied. The packaging configuration points to the existing `noteflow-production` database. The production migration ledger already records the initial schema. Apply future migrations with `pnpm exec wrangler d1 migrations apply DB --remote --config outputs/cloudflare/wrangler.json`; never edit applied SQL.

4. Deploy:

   ```sh
   pnpm exec wrangler deploy --config outputs/cloudflare/wrangler.json
   ```

5. Open the returned workers.dev URL. Confirm `/api/health`, create and save a note, refresh, archive, and restore it. Never connect local QA scripts to another project’s database.

## Deploy a fork into another account

Create a separate database with `pnpm exec wrangler d1 create noteflow-production`. Update the database ID in `scripts/prepare-cloudflare.mjs`; the existing ID is an identifier, not a secret, but it will not work without access to its owner’s account. Set a unique Worker name if needed. Run `pnpm prepare:cloudflare`, apply schema migrations with `pnpm exec wrangler d1 migrations apply DB --remote --config outputs/cloudflare/wrangler.json`, and deploy the generated config.

The generated config uses `no_bundle` and includes ESM rules for the already-built module tree. Keep `entry.js`, `noteflow-assets.js`, and all server chunks together. Do not deploy just an HTML directory: the notes API requires the Worker and DB binding.

## CI and release workflow

`.github/workflows/ci.yml` runs locked installation, type checks, linting, formatting checks, tests, production build, and a production dependency audit on pushes and pull requests.

`.github/workflows/deploy.yml` is a manually triggered release workflow. It requires GitHub repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, plus an optional protected `production` environment. The token needs Workers Scripts edit and D1 access for this account. Credentials are not saved in this project or automatically created by this task. The first public deployment was published through the connected account; subsequent automated releases require these repository secrets.

Keep migration rollout separate from generic source pushes. Back up the database before a destructive schema change. A Worker rollback does not undo a database migration. Schema changes should be additive and backward compatible.

## Environment

`.env.example` lists the optional test URL and credential names. Local development needs no secrets. Never put a deployment token in frontend code, a README, a workflow file, or `.openai/hosting.json`.
