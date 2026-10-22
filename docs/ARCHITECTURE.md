# Architecture decisions

## One deployable service

A React client and a Worker API share an origin. This avoids CORS configuration, extra hosting, and a database TCP connection pool. The UI uses the Next.js App Router API through the pinned Vinext adapter. D1 is a good fit for small relational workspaces and atomic updates. Drizzle is used for schema definitions and migration generation; carefully scoped SQL provides a straightforward compare-and-swap update.

## Isolation without an account wall

The public demo opens directly into a useful seeded workspace. A 256-bit bearer capability is stored in an HttpOnly cookie. Its digest is the database workspace key. Notes are never selected using a client-provided owner. This provides independent guest spaces without fake authentication screens or shared mutable demo data.

A workspace expires 90 days after creation, rather than renewing indefinitely. Cleanup is bounded and runs when another workspace is created. Expiry is enforced when reading the workspace even if physical cleanup has not yet run. An expired cookie creates a new workspace only through the same-origin initialization endpoint.

For a future account product, use the hosting platform’s identity integration and migrate guest ownership after a verified sign-in. Do not trust identity headers on an independently deployed public Worker without a validating identity proxy.

## Consistent editing

The saved note and the current draft are separate values. Cancel restores the saved value. Navigation away from a dirty draft opens a native modal. The browser also prompts before unloading a dirty draft. Save is explicit: changing text alone does not issue network requests. A note version is part of every update and delete; the SQL predicate checks owner and version in the same statement. A missing owned row returns 404, while a stale version returns 409. The editor retains unsaved input after an API error so it can be copied before reloading.

## Bounded search

The initial request loads at most 500 owned notes. Search and tag filtering are synchronous pure functions over this bounded set, avoiding network traffic on every keystroke. Archives stay separate in normal navigation; global search includes them. This is appropriate for the demo’s limits. Pagination, lazy content loading, and SQLite FTS should replace full-workspace loading for a larger deployment.

## Presentation and accessibility

CSS variables define theme tokens. Tailwind 4 supplies the utility layer; component styles keep the more detailed responsive layout readable. The app has desktop navigation, tablet bottom navigation, and separate mobile list/editor states. Settings are loaded with React.lazy. System fonts remove font network requests. Native dialogs handle modal focus containment; focus is moved to the safe action after opening. The interface uses real controls, accessible names, validation alerts, status notifications, and reduced-motion handling.

## Deployment artifacts

The normal build outputs a Cloudflare Worker and hashed client chunks. The standalone packaging script includes the small static asset set in a generated module so deployment is reproducible with a single Worker upload. Static assets receive immutable browser caching; API and HTML responses are not cached. At higher traffic volumes, moving assets to a native Workers Assets binding would reduce Worker invocations and improve edge caching.

## Known operational boundaries

Vinext is a beta adapter and must be kept under integration tests. Session creation has a per-IP limit and each workspace has its own rate limit, but this is not a replacement for platform-level abuse controls. There is no global sign-up quota, paid-service billing guard, or dedicated monitoring alert integration. Introduce these before operating an open service at significant scale. Cloudflare’s database and traffic quotas still apply.
