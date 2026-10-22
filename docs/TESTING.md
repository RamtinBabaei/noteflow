# Validation report

Validation date: **22 October 2026**. This report distinguishes executed checks from additional verification still needed.

## Results

| Check                              | Executed result                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Strict TypeScript                  | Passed with `pnpm typecheck`                                                                                             |
| ESLint                             | Passed with no warnings in application code                                                                              |
| Automated model/security/API suite | **19 passed, 0 failed**                                                                                                  |
| Production build                   | Passed after dependency patches                                                                                          |
| Local database setup               | Built and applied the initial migration successfully                                                                     |
| Live HTTP integration              | **18 passed** against the public Cloudflare deployment                                                                   |
| Production dependency audit        | **0 advisories** of any severity                                                                                         |
| Full dependency audit              | **1 high development-only advisory**, described below                                                                    |
| Chromium desktop                   | Note creation, validation, editing, persistence, tags, search, archive/restore, dialogs, settings, and downloads checked |
| Chromium responsive layouts        | 320, 390, 768, and 1024 CSS-pixel frame widths checked, plus the full desktop viewport                                   |
| Live database persistence          | Saved a note through the public UI, reloaded, and verified it remained                                                   |
| JSON and text export               | Downloaded both through the live UI and inspected their bytes                                                            |

Raw production/development advisory results and live HTTP output are in [`validation/`](validation/).

## Review pass 1 — Architecture and code quality

Reviewed the complete authored model, security helpers, API, schema, UI controller, editor, settings, modal, and setup/deployment scripts. The architecture uses one same-origin service, bounded data loading, independent saved/draft values, strict request schemas, and parameterized owner-scoped SQL.

Removed unused starter UI packages and components. Fixed strict typing at the HTTP client boundary, cleaned lint findings, formatted application source, and separated settings into a lazy-loaded module. No runtime credentials are committed. `.env.example` is intentionally included despite the generic environment-file ignore rule.

## Review pass 2 — Functionality and integration

The executable tests cover:

- Required and oversized fields, unknown properties, tag trimming/deduplication, and word counts.
- Search across title/body/tags, archive inclusion in global search, exact tag filtering, and active tag derivation.
- Cookie parsing, session hashing, cross-origin protection, content types, malformed JSON, and streamed request size limits.
- Database-backed creation, reading, editing, archiving, restoration, and deletion.
- Cross-workspace read/write/delete isolation.
- Stale updates/deletions, quote-containing titles, script-like text, workspace capacity, and rate limits.

API tests execute the real parameterized SQL using Node SQLite behind a small adapter for the D1 methods used by the application. This is not an actual Cloudflare-runtime test by itself. The live HTTP suite separately exercises the deployed Worker and real D1 binding, covering those integration boundaries.

The first model-test failure was a fixture error: the archived sample accidentally reused the searchable body. Correcting its independent content made the expected result accurate. No failure was hidden or marked as passed without rerunning it.

Chromium interaction checks covered title validation and focus, Unicode content, save/reload persistence, cancel restoring saved content, unsaved-change confirmation, archive confirmation and restore, tag filtering, empty search results, Ctrl+K, safe delete-dialog cancellation, mobile search/list/editor navigation, dark appearance, monospace typography, and preference persistence after reloading. Final deletion behavior was exercised by automated API and live HTTP checks; the manual UI check stopped at cancellation.

A 320-pixel editor check found 10 pixels of footer overflow. Narrow-screen button padding and status text were adjusted, and the footer width was checked again. Wider breakpoints showed no horizontal workspace overflow.

## Review pass 3 — Performance, security, and deployment

The original starter dependency graph contained known advisories. Updated Next.js, React/React DOM/RSC, Vite, and affected transitive dependencies to patched compatible releases, then reran type checks, linting, tests, build, and audit. Transitive overrides live in `pnpm-workspace.yaml`, which pnpm actually reads.

Production dependencies have **zero audit findings**. The complete development graph retains one high advisory in `braces <=3.0.3`: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), a stack-exhaustion issue for deeply nested glob patterns. The advisory database lists no patched release. It is reached through build/lint glob tooling, not included in the deployed application’s request path. Do not process untrusted glob patterns through those tools; replace/update the dependency when a compatible fix becomes available. This remaining finding is disclosed rather than suppressed.

Production behavior includes HttpOnly/Secure/SameSite cookies, 256-bit random capabilities stored only as hashes, exact origin checks, parameterized SQL, version-based conflict prevention, a bounded request reader, field/workspace quotas, rate limiting, no HTML evaluation, no-store private responses, security response headers, and no external runtime font or image requests.

The local preview’s bundled runtime supports an older compatibility date. A newer date initially prevented preview startup; the local configuration was restored to its supported date and the preview restarted. The standalone public deployment uses 2026-10-22 and was verified independently. Development hot-reload errors during that repair are not presented as successful application tests.

All generated client JavaScript chunks together measure approximately **530 KB raw / 160 KB gzip**; CSS approximately **32 KB raw / 7.6 KB gzip**. These are local gzip measurements of all chunks, not measured network transfer or a first-load-only budget. Settings are loaded on demand. Cloudflare reported approximately **10 ms Worker startup** for the initial public upload; that is not an end-user page load time.

The standalone artifact serves hashed static files with immutable browser caching. Native Workers Assets/CDN integration is a future traffic-scaling improvement. The initial database schema and migration ledger were applied to the dedicated production database before publication. The online UI and API were then checked through both Chromium and HTTP.

## Not claimed or not completed

No fabricated Lighthouse score, Core Web Vitals certification, test coverage percentage, cross-browser certification, penetration test, sustained load result, or assistive-technology audit is claimed. Automated DOM component tests and a separately executed Playwright test-runner suite are not included; browser workflows were driven through the provided Chromium browser automation. The 19 executable tests and 18 live HTTP assertions are the automated suites actually run.

Firefox, Safari/iOS, offline editing, account sign-in/password reset, cross-device synchronization, end-to-end encryption, import, and large-workspace pagination remain outside this release’s verified scope. GitHub release automation requires repository deployment secrets; the first live deployment does not depend on them.
