# NoteFlow

A little space for your thoughts. NoteFlow is a responsive, full-stack notes workspace with a focused editor, searchable tags, archives, and personal themes.

**[Live demo](https://noteflow.ramtinbabaei-portfolio.workers.dev)** · **[Source](https://github.com/RamtinBabaei/noteflow)**

## What you can do

- Create, edit, and permanently delete notes, with confirmation for destructive actions.
- Archive and restore notes without losing their content or tags.
- Search titles, content, and tags, including archived notes.
- Browse notes by tag and see useful empty and error states.
- Choose light, dark, or system appearance and sans-serif, serif, or monospace typography.
- Export an individual note as text or the entire workspace as JSON.
- Use a keyboard throughout, with visible focus, native modal focus containment, and unsaved-change protection.
- Keep notes after a refresh using an isolated, database-backed guest workspace.

## Stack and decisions

React 19, strict TypeScript, Tailwind CSS 4, and the Next.js App Router API through Cloudflare’s Vinext adapter. A single Cloudflare Worker serves the UI and REST API; Cloudflare D1 provides SQLite storage. Drizzle defines the schema and generates committed SQL migrations; request handlers use parameterized D1 statements for atomic version checks and updates. Zod validates request boundaries.

There is no separate Express process, external database connection, state-management framework, or animation library. Those would add operational weight to a small, bounded workspace. React state holds the editor draft; pure functions handle filtering. Settings are a separate lazy-loaded chunk. CSS handles subtle transitions and respects reduced-motion preferences. System fonts avoid font downloads and layout shifts.

Vinext is pinned to a beta release. Treat upgrades as an integration change and run the entire validation suite. This is a tested portfolio demo, not a claim of enterprise-scale operational certification.

## Run locally in VS Code

Requirements: Node.js **22.13 or later** (Node 24 LTS recommended), Git, and pnpm. No database service, Docker, API key, or Cloudflare login is needed for local development.

1. Download and extract the ZIP, or clone the repository:

   ```sh
   git clone https://github.com/RamtinBabaei/noteflow.git
   cd noteflow
   ```

2. In VS Code, select **File → Open Folder**, open `noteflow`, then select **Terminal → New Terminal**.
3. Enable the package manager and install dependencies:

   ```sh
   corepack enable
   pnpm install --frozen-lockfile
   ```

   If your Node installation does not include Corepack, install pnpm with `npm install -g pnpm@11.25.0` instead. Windows users can run these commands in PowerShell.

4. Build and initialize the local database:

   ```sh
   pnpm setup:local
   ```

5. Start development:

   ```sh
   pnpm dev
   ```

Open **http://localhost:5173**. Create a note, save it, and refresh: it should remain. `/api/health` should return `{"status":"ok","database":"connected"}`. Themes persist in browser storage. Stop the server with **Ctrl+C**.

The local database lives in ignored `.wrangler/state`. `setup:local` tracks applied migration filenames, so subsequent runs do not replay them. Keep this directory if you want to retain local notes. Local data and online data are separate.

## Commands

| Command                   | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                | Start local development at port 5173                        |
| `pnpm setup:local`        | Build and apply pending local migrations                    |
| `pnpm typecheck`          | Check strict TypeScript types                               |
| `pnpm lint`               | Run ESLint                                                  |
| `pnpm test`               | Run model, security, and SQLite-backed API tests            |
| `pnpm test:http`          | Run 18 HTTP integration assertions against a running server |
| `pnpm build`              | Generate the production Worker and client bundles           |
| `pnpm start`              | Preview the production build; use the printed local URL     |
| `pnpm db:generate`        | Generate migrations after schema changes                    |
| `pnpm prepare:cloudflare` | Package the standalone Cloudflare deployment                |
| `pnpm format:check`       | Check formatting for application code and documentation     |
| `pnpm audit`              | Check the current dependency advisory database              |

For HTTP checks on PowerShell:

```powershell
$env:TEST_BASE_URL = 'http://localhost:5173'
pnpm test:http
```

On macOS/Linux: `TEST_BASE_URL=http://localhost:5173 pnpm test:http`.

The HTTP suite creates two isolated test workspaces and deletes only the note it creates. The guest workspaces expire automatically.

## Architecture

```text
app/                    App shell, metadata, API entry point, global design tokens
components/notes/       Workspace, editor, settings, and accessible dialogs
features/notes/         Shared types, Zod schemas, filtering, seeds, HTTP client
server/                 Session authorization, CSRF checks, rate limits, REST logic
db/                     Drizzle schema and database helper
drizzle/                Generated SQL migrations and schema snapshots
tests/                  Executable model, security, and API tests
worker/                 Streaming Worker entry and security response headers
scripts/                Portable setup, build, integration, and deployment helpers
docs/                   Architecture, API, deployment, and validation notes
```

See [architecture](docs/ARCHITECTURE.md), [API](docs/API.md), [deployment](docs/DEPLOYMENT.md), and the [testing report](docs/TESTING.md).

## Data model and security

Each visitor gets a cryptographically random 256-bit session token in an HttpOnly, SameSite=Strict cookie; HTTPS adds Secure. Only its SHA-256 digest is stored in the database. Every note read or mutation is scoped to that workspace on the server. Writes also require an exact same-origin header and JSON. Stale updates and deletions return `409`, rather than overwriting another tab’s changes.

The app limits note size, title length, tags, workspace note count, incoming request bytes, workspace requests, and session creation. Note content is always text; no user HTML is executed. Private API responses are `no-store`. SQL uses bound parameters. Credentials are not included in source or client bundles. A production CSP and restricted browser permissions provide additional defense.

## Scope and practical limits

- This version implements all **core** challenge workflows and the database bonus. Email/password accounts, password reset, cross-device sync, and rich-text editing are not included; the challenge lists these as optional extensions.
- A guest workspace lasts **90 days from creation**. Clearing cookies removes the browser’s access to it. Export a backup before clearing browser data. JSON export is available; importing a backup is not implemented.
- Each workspace is limited to **500 notes**, **50,000 characters per note**, and **12 tags per note**. Listing loads the bounded workspace into memory for responsive local search; a larger service would use pagination and a search index.
- The session cookie is an access capability. This app is not end-to-end encrypted and is not intended for passwords or sensitive records.
- Automated SQL tests and Chromium browser checks are documented. Firefox/Safari, assistive-technology certification, external penetration testing, sustained load testing, and formal Lighthouse scoring have not been completed.

## Design reference

The layout and core workflows follow the [Frontend Mentor note-taking challenge](https://www.frontendmentor.io/challenges/note-taking-web-app-773r7bUfOG). NoteFlow adds its own visual identity, helpful copy, safer editing behavior, and deployment tooling. The implementation is written for this project; no third-party solution source was copied. Premium Figma and starter assets are not redistributed.

## Author

Ramtin Babaei · [GitHub](https://github.com/RamtinBabaei)
