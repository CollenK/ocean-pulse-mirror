# Production Readiness Audit

**Date:** 2026-03-11
**Scope:** Full codebase audit for closed beta launch targeting EU and western-country users

---

## 1. Codebase Summary

Ocean PULSE is a Next.js 16 PWA (React 19, TypeScript strict mode) backed by Supabase (PostgreSQL + PostGIS + Auth + Storage). It serves marine conservation data from several external APIs (OBIS, Copernicus, Global Fishing Watch, Movebank, MPAtlas) and lets users submit field observations with photos. The offline-first architecture uses IndexedDB via `idb` with service worker caching (Workbox/next-pwa). Error tracking is via Sentry; analytics via Google Analytics with cookie consent. Deployment is on Vercel (frontend) with a Python data service on Render.

**Current state:** The core product works well. The offline-first PWA architecture, Supabase RLS, and TanStack Query caching are solidly implemented. However, there are critical gaps in GDPR compliance (no account deletion or data export), security hardening (no security headers, no rate limiting, open redirect vulnerability), and observability (Sentry only wired up in the React ErrorBoundary, not in API routes or services). No unit tests exist; E2E coverage is moderate but runs against production only.

---

## 2. Findings by Category

### Category 1: Data Integrity & Multi-Tenancy

**What's solid:** RLS is enabled on all tables. User-scoped data (observations, saved MPAs, health assessments, profiles) is properly gated by `auth.uid() = user_id` policies. Service role policies are scoped to data ingestion tables only. Supabase handles parameterized queries, eliminating SQL injection. The `ON DELETE CASCADE` on saved_mpas ensures cleanup when users or MPAs are removed.

---

#### 1.1 Foreign key constraints dropped and never re-added

- **Priority:** P1
- **Status:** Not started
- **Problem:** Migration `supabase/migrations/003_fix_mpa_id_type.sql` lines 12-13 drop FK constraints on `observations.mpa_id` and `user_health_assessments.mpa_id` to change the column type from UUID to TEXT. The constraints are never re-created. Any string can now be inserted as `mpa_id`, including values that reference no actual MPA. Over time this will produce orphaned data that corrupts aggregation queries (the `mpa_community_health` view, `get_mpa_community_health` function).
- **Solution:** New migration: re-add FK constraints referencing `mpas.external_id` (which is TEXT). If `external_id` lacks a UNIQUE constraint, add one first. Audit existing data for orphaned rows before adding the constraint.

#### 1.2 Non-atomic observation + health assessment creation

- **Priority:** P1
- **Status:** Not started
- **Problem:** `lib/observations-service.ts` lines 81-90 insert the observation first, then separately insert a `user_health_assessments` row. If the second insert fails (network error, constraint violation), the observation exists without its health assessment. There is no transaction wrapping. Supabase JS client does not support multi-table transactions.
- **Solution:** Create a Postgres function `create_observation_with_health(...)` that performs both inserts in a single transaction. Call it via `supabase.rpc()`. This also improves performance (one round trip instead of two).

#### 1.3 Non-atomic delete (health assessments then observation)

- **Priority:** P2
- **Status:** Not started
- **Problem:** `lib/observations-service.ts` lines 330-346 delete health assessments first, then the observation. If the observation delete fails, the assessments are already gone. Same issue applies to updates.
- **Solution:** Cascade delete from observations to health assessments via FK constraint (requires 1.1 to be fixed first), or use a Postgres function.

#### 1.4 No write policies on core data tables for anon key

- **Priority:** P0 (verify)
- **Status:** Not verified
- **Problem:** `001_initial_schema.sql` defines INSERT/UPDATE policies only for `service_role` on `mpas`, `environmental_data`, `species_data`, `health_scores`. There are no INSERT/UPDATE policies for `anon` or `authenticated` roles on these tables. This is correct if only the backend data service writes to them. However, if the anon key (exposed client-side) could somehow bypass RLS, these tables would be writable. Supabase anon key respects RLS by default, so this should be safe, but verify that no client-side code calls `.insert()` on these tables.
- **Solution:** Verify via `grep -r "from('mpas')" --include='*.ts' | grep -v select` and equivalent for other tables. If no client writes found, this is fine. If any found, they are a data integrity risk.

---

### Category 2: Security

**What's solid:** Supabase handles session management with HTTP-only cookies via `@supabase/ssr`. The PKCE OAuth flow is used. Sentry filters sensitive query params (`code`, `token`) before sending. The GFW API token is server-side only, never in `NEXT_PUBLIC_*` variables. `.env` is in `.gitignore`.

---

#### 2.1 Open redirect in OAuth callback

- **Priority:** P0
- **Status:** Not started
- **Problem:** `app/auth/callback/route.ts` line 25: `return NextResponse.redirect(\`${baseUrl}${next}\`)` where `next` comes from `searchParams.get('next')` (line 7). An attacker can craft `?next=//evil.com` or `?next=https://evil.com` which, depending on browser URL parsing, could redirect the user after login to a phishing page. The `baseUrl` concatenation does not prevent protocol-relative or absolute URL injection.
- **Solution:** Validate `next` is a relative path starting with `/` and does not contain `//`. Example: `if (!next.startsWith('/') || next.startsWith('//')) next = '/ocean-pulse-app';`

#### 2.2 No security headers

- **Priority:** P0
- **Status:** Not started
- **Problem:** No Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers are configured anywhere. Not in `next.config.js`, not in middleware, not in Vercel config. The app is vulnerable to clickjacking, MIME sniffing, and has no XSS mitigation layer beyond React's default escaping.
- **Solution:** Add a `headers()` function in `next.config.js` returning security headers for all routes. CSP should allow `self`, Supabase domain, map tile domains, Google Analytics (if consented), and Sentry. Start with `Content-Security-Policy-Report-Only` to avoid breaking things, then enforce.

#### 2.3 No rate limiting on API routes

- **Priority:** P0
- **Status:** Not started
- **Problem:** `/api/gfw` and `/api/sst-tile` are public proxy routes with no rate limiting. A malicious user could exhaust the GFW API token quota (which has strict per-token limits) or generate excessive Copernicus tile requests. There is also no rate limiting on Supabase Auth endpoints (login, signup) beyond Supabase's own defaults.
- **Solution:** For Vercel deployment, use Vercel's built-in rate limiting (vercel.json `rewrites` with rate limit rules) or add an in-memory rate limiter (e.g., `upstash/ratelimit` with Redis) in the API route handlers. At minimum, limit `/api/gfw` to 30 requests/minute per IP and `/api/sst-tile` to 120 requests/minute per IP.

#### 2.4 API routes not authenticated

- **Priority:** P1
- **Status:** Not started
- **Problem:** `/api/gfw/route.ts` and `/api/sst-tile/route.ts` accept requests from anyone, not just authenticated users. While the data itself is not sensitive, these routes proxy to rate-limited external APIs using the app's credentials. An unauthenticated attacker could drain API quotas.
- **Solution:** Add Supabase auth check at the top of each API route handler. For the SST tile endpoint (used by the map which may be visible to unauthenticated users), consider a lightweight token or at least IP-based rate limiting.

#### 2.5 GFW API token partially exposed in health check

- **Priority:** P1
- **Status:** Not started
- **Problem:** `app/api/gfw/route.ts` line 141: `const tokenPreview = hasToken ? \`${token.substring(0, 10)}...${token.substring(token.length - 5)}\` : null;` returns the first 10 and last 5 characters of the API token in the health check response. This is 15 characters of a token that may be short enough for brute-force completion.
- **Solution:** Remove `tokenPreview` from the response. Return only `configured: true/false`.

#### 2.6 Photo upload lacks server-side validation

- **Priority:** P1
- **Status:** Not started
- **Problem:** `lib/observations-service.ts` lines 360-406: `uploadObservationPhoto()` accepts any base64 string, hardcodes content type as `image/jpeg`, and trusts the `userId` parameter for the storage path. No file size limit is enforced (a multi-MB base64 string is processed entirely in memory). No MIME type validation is performed on the actual bytes. The `userId` is not validated as a UUID before being used in the file path.
- **Solution:** (1) Validate `userId` is a UUID. (2) Check decoded byte length against a maximum (e.g., 5MB). (3) Validate the first bytes match JPEG or PNG magic numbers. (4) Consider moving upload to a server action or API route with proper size limits in the request body.

#### 2.7 Sentry session replay captures unmasked text

- **Priority:** P1
- **Status:** Not started
- **Problem:** `sentry.client.config.ts` lines 49-50: `maskAllText: false, blockAllMedia: false`. Sentry session replays will capture all visible text and media in the user's browser session, including search queries, observation notes, and any PII visible on screen. For EU users, this is a GDPR concern as this data is sent to Sentry's servers.
- **Solution:** Set `maskAllText: true` and `blockAllMedia: true`. This is a one-line config change with zero functional impact.

#### 2.8 CORS wildcard on SST tile endpoint

- **Priority:** P2
- **Status:** Not started
- **Problem:** `app/api/sst-tile/route.ts` sets `Access-Control-Allow-Origin: *`. While the data is public scientific data, the wildcard allows any website to proxy requests through this endpoint, burning the app's Copernicus quota.
- **Solution:** Set the origin to the app's production domain(s) or remove CORS headers entirely (same-origin requests don't need them).

#### 2.9 Server-side route protection commented out

- **Priority:** P2
- **Status:** Not started
- **Problem:** `lib/supabase/middleware.ts` lines 45-55: route protection logic is entirely commented out. All "protected" routes (observe, profile, saved) rely on client-side auth checks which can be bypassed. While Supabase RLS prevents unauthorized data access, the UX is poor: users see partially loaded pages with "sign in" prompts instead of clean redirects.
- **Solution:** Uncomment and configure the middleware redirect for `/ocean-pulse-app/observe`, `/ocean-pulse-app/profile`, and `/ocean-pulse-app/saved` routes.

---

### Category 3: Error Handling & Resilience

**What's solid:** The GFW client (`lib/gfw-client.ts`) is production-grade with AbortController timeouts (60s), retry with exponential backoff (3 retries), and rate limit detection (429 handling). The Movebank client has similar retry logic. The offline-first observation pattern gracefully falls back to IndexedDB when Supabase is unreachable.

---

#### 3.1 Sentry not wired up in API routes or service layer

- **Priority:** P0
- **Status:** Not started
- **Problem:** `Sentry.captureException()` is only called in `components/ErrorBoundary.tsx` (line 42-45). The entire service layer (`lib/*.ts`), all API routes (`app/api/*/route.ts`), and all hooks use `console.error` only. In production on Vercel, console output goes to ephemeral function logs that are not aggregated, alerted on, or retained long-term. Errors will be invisible to the solo founder.
- **Solution:** Add `Sentry.captureException(error)` in the catch blocks of: (1) all API route handlers, (2) `observations-service.ts` mutation functions, (3) `mpa-service.ts` fetch functions, (4) `offline-storage.ts` sync operations. Consider a wrapper: `function captureError(error: unknown, context?: Record<string, string>) { console.error(error); Sentry.captureException(error, { extra: context }); }`.

#### 3.2 No request timeouts on OBIS, Copernicus, or data-service calls

- **Priority:** P1
- **Status:** Not started
- **Problem:** `lib/obis-client.ts`, `lib/obis-abundance.ts`, `lib/obis-environmental.ts`, `lib/obis-tracking.ts`, and `lib/api/data-service.ts` all use bare `fetch()` with no timeout. If any external API hangs (which OBIS does occasionally), the request blocks indefinitely. On Vercel, this will hit the 60s function timeout and produce a generic 504 error with no useful diagnostics.
- **Solution:** Add AbortController with a 30s timeout to all external fetch calls. The pattern from `lib/gfw-client.ts` lines 75-90 can be extracted into a shared `fetchWithTimeout()` utility.

#### 3.3 No health check endpoint

- **Priority:** P1
- **Status:** Not started
- **Problem:** There is no `/api/health` endpoint that an uptime monitor (UptimeRobot, Better Uptime, etc.) can hit to verify the app is running and its dependencies are reachable. The GFW health check at `/api/gfw?action=health-check` only tests the GFW token, not Supabase connectivity or general app health.
- **Solution:** Create `app/api/health/route.ts` that: (1) verifies Supabase connection with a simple `SELECT 1`, (2) returns `200 OK` with dependency status. Register this URL with an uptime monitoring service.

#### 3.4 Silent failures return empty data indistinguishable from "no data"

- **Priority:** P2
- **Status:** Not started
- **Problem:** Throughout the service layer, catch blocks return empty arrays or null: `lib/mpa-service.ts` lines 235-237 return `[]` on error; `lib/species-service.ts` returns `[]`; `lib/observations-service.ts` returns `{ observations: [], totalCount: 0 }`. The UI renders "No data available" identically for "API error" and "genuinely no data." The user has no way to know something is broken.
- **Solution:** Return a result type that distinguishes errors from empty data, e.g., `{ data: T[], error?: string }`. Components can then show "Failed to load" vs "No results."

#### 3.5 Offline sync never triggers automatically

- **Priority:** P1
- **Status:** Not started
- **Problem:** `lib/offline-storage.ts` provides `saveObservationLocally()` and `markObservationSynced()`, but there is no automatic sync mechanism. `getUnsyncedObservations()` exists but is never called on a schedule or on network reconnection. The `useNetworkStatus` hook registers for Background Sync (line 68-73) but this only works if a sync handler is registered in the service worker, which it is not.
- **Solution:** Either (1) register a `sync` event handler in the service worker that calls the sync function, or (2) add a `useEffect` in a top-level component that calls sync on network reconnection and on a periodic interval (e.g., every 5 minutes when online).

---

### Category 4: Compliance & Legal (GDPR + Financial)

**What's solid:** Privacy policy and Terms of Service exist at `/privacy` and cover data collection, lawful basis, retention principles, and user rights. Cookie consent is well-implemented with accept/reject/customize options, localStorage persistence, consent versioning, and DNT header respect. Google Analytics only loads after explicit consent. RLS enforces data isolation at the database level.

**Not applicable:** No payment processing, billing, invoicing, or financial data handling exists. If monetization is planned, this entire area needs to be built from scratch. No VAT/tax handling is needed until then.

---

#### 4.1 No account deletion (GDPR Article 17 - Right to Erasure)

- **Priority:** P0
- **Status:** Not started
- **Problem:** The privacy policy (Section 7) promises the right to erasure and states "If you delete your account, your personal data will be removed." However, there is no mechanism to delete an account. The profile page only has a "Sign Out" button. No API endpoint, no UI flow, no background job. If a user requests deletion via email, there is no documented procedure to fulfill it within the required 30 days.
- **Solution:** (1) Create `app/api/gdpr/delete-account/route.ts` that deletes from `profiles`, `saved_mpas`, `observations`, `user_health_assessments` for the authenticated user, then calls `supabase.auth.admin.deleteUser()`. (2) Add a "Delete Account" button to the profile page with confirmation dialog. (3) The `ON DELETE CASCADE` on `saved_mpas` will handle that table; observations and health assessments need explicit deletion or anonymization.

#### 4.2 No data export (GDPR Article 20 - Right to Portability)

- **Priority:** P0
- **Status:** Not started
- **Problem:** The privacy policy promises data portability but no export mechanism exists. Users cannot download their observations, health assessments, saved MPAs, or profile data.
- **Solution:** Create `app/api/gdpr/export/route.ts` that returns a JSON file containing the authenticated user's profile, observations, health assessments, and saved MPAs. Add a "Download My Data" button to the profile page.

#### 4.3 No email service for GDPR request acknowledgment

- **Priority:** P1
- **Status:** Not started
- **Problem:** The privacy policy directs users to email `privacy@balean.org` for GDPR requests and promises a 30-day response. However, there is no email service integrated (no SendGrid, Resend, Postmark, etc.), so automated acknowledgment emails cannot be sent. There is also no system to track requests and ensure the 30-day deadline is met.
- **Solution:** For closed beta, a manual process with a shared spreadsheet may suffice, but document it. Before scaling, integrate an email service and build request tracking.

#### 4.4 Data Processing Agreements not documented

- **Priority:** P1
- **Status:** Not verified
- **Problem:** The privacy policy mentions sub-processors (Supabase, Vercel, Google Analytics, Sentry) but does not link to their DPAs. GDPR requires Data Processing Agreements with all processors. Supabase and Vercel provide DPAs upon request, but it's unclear if they've been signed.
- **Solution:** Sign DPAs with Supabase, Vercel, Google (for GA), and Sentry. Add a sub-processor list to the privacy policy or a linked page.

#### 4.5 No Terms of Service acceptance tracking

- **Priority:** P1
- **Status:** Not started
- **Problem:** Users are never asked to agree to the Terms of Service or Privacy Policy during signup. The OAuth flow goes directly through Google to the app with no consent checkpoint. Without acceptance records, the ToS may not be legally binding.
- **Solution:** After first OAuth login, show a one-time interstitial that requires the user to accept ToS/Privacy before proceeding. Store the acceptance timestamp and ToS version in the `profiles.preferences` JSONB column.

#### 4.6 No data retention enforcement

- **Priority:** P2
- **Status:** Not started
- **Problem:** The privacy policy states data is retained "for as long as your account is active" and observations "for scientific research purposes." However, there are no automated cleanup jobs. Draft observations (`is_draft = true`) accumulate forever in both Supabase and IndexedDB. `offline-storage.ts` has `clearOldCache()` (line 424-439) for cached data but exempts observations.
- **Solution:** Create a scheduled job (Supabase pg_cron or Vercel cron) that deletes draft observations older than 90 days. Document the retention policy more specifically.

---

### Category 5: Observability & Operations

**What's solid:** Sentry is configured for client, server, and edge runtimes with appropriate sample rates (10% production). The Sentry config properly filters noisy browser errors and sensitive query params. The PWA service worker caches external API responses with sensible TTLs.

---

#### 5.1 No structured logging

- **Priority:** P1
- **Status:** Not started
- **Problem:** All logging is `console.log` / `console.error` with unstructured messages. There are 111+ console statements across `lib/`. On Vercel, these go to ephemeral function logs with no aggregation, search, or alerting. There are no correlation IDs to trace a request across service calls. Debug statements like `console.log('PAGE DEBUG - MPAs: ...')` (`app/(app)/ocean-pulse-app/page.tsx` line 139) and `console.log('MAP DEBUG - ...')` (`components/Map/MobileMap.tsx` line 85) are still in production code.
- **Solution:** (1) Remove or gate debug logging behind `NODE_ENV === 'development'`. (2) For production, consider Vercel's Log Drain to a service like Datadog or Axiom. (3) At minimum, ensure all error logs include enough context to diagnose (user ID, MPA ID, action).

#### 5.2 No uptime monitoring

- **Priority:** P1
- **Status:** Not started
- **Problem:** No uptime monitoring service is configured. If the Vercel deployment goes down, the Next.js build breaks, or Supabase becomes unreachable, nobody is alerted. The data service on Render has a `/health` endpoint but no external monitor hitting it.
- **Solution:** Set up a free uptime monitoring service (UptimeRobot, Better Uptime) that hits the health endpoint (once 3.3 is implemented) and sends alerts via email or Slack.

#### 5.3 No database backup verification

- **Priority:** P1
- **Status:** Not verified
- **Problem:** Supabase provides automatic daily backups on paid plans, but it's unclear which Supabase plan is in use or whether backups have been tested. A backup that has never been restored is not a backup.
- **Solution:** Verify the Supabase plan includes point-in-time recovery. Test a backup restore to a separate project. Document the restore procedure.

#### 5.4 CI pipeline missing lint and type-check stages

- **Priority:** P2
- **Status:** Not started
- **Problem:** `.gitlab-ci.yml` runs migrations and build but does not run `npm run lint` or `npm run type-check` before the build stage. Type errors or lint violations could ship to production undetected.
- **Solution:** Add a `validate` stage before `build` that runs `npm run type-check && npm run lint`.

#### 5.5 Deploy stage disabled in CI

- **Priority:** P2
- **Status:** Not verified
- **Problem:** `.gitlab-ci.yml` lines 56-68 have the deploy stage commented out. Deployment appears to happen via Vercel's GitHub/GitLab integration, but this is not documented. If Vercel auto-deploys every push to main, there's no gate between "CI passes" and "code is live."
- **Solution:** Document the deployment mechanism. Consider requiring CI to pass before Vercel deploys (Vercel supports "ignored build step" with a script that checks CI status).

---

### Category 6: Performance & Scale

**What's solid:** Next.js dynamic imports are used for heavy components (MapLibre, charts). TanStack Query provides client-side caching. The PWA service worker caches map tiles, API responses, and fonts with appropriate strategies (CacheFirst for static assets, NetworkFirst for API data). PostGIS indexes exist on geometry columns for spatial queries.

---

#### 6.1 Client-side distance calculation instead of PostGIS

- **Priority:** P2
- **Status:** Not started
- **Problem:** `lib/mpa-service.ts` `findNearestMPAs()` (lines 302-329) fetches ALL MPAs from Supabase then filters by distance client-side using a JavaScript Haversine formula. The code has a comment on line 303: "For production, you'd use PostGIS ST_Distance". With 100+ MPAs this is tolerable but scales poorly.
- **Solution:** Replace with a Postgres function using `ST_DWithin(center::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, distance_meters)`. This uses the existing GIST index and returns only nearby MPAs.

#### 6.2 No server-side pagination on MPA list

- **Priority:** P2
- **Status:** Not started
- **Problem:** `fetchAllMPAs()` in `lib/mpa-service.ts` fetches all MPAs at once (lines 200-214, two parallel queries with no `LIMIT`). As the database grows, this becomes increasingly expensive. The species search in `lib/species-service.ts` hardcodes `limit: 20` (line 109) but has no offset/cursor pagination.
- **Solution:** Not urgent for beta (100-200 MPAs), but add pagination parameters before the MPA count exceeds ~500.

#### 6.3 Debug console.log statements in hot paths

- **Priority:** P2
- **Status:** Not started
- **Problem:** `app/(app)/ocean-pulse-app/page.tsx` line 139: `console.log('PAGE DEBUG - MPAs: ...')` runs on every MPA load. `components/Map/MobileMap.tsx` lines 85, 104, 107-113: multiple `console.log('MAP DEBUG ...')` statements run in a `useMemo` that executes on every MPA list change. These produce noise in production logs and have minor performance cost.
- **Solution:** Remove or wrap in `if (process.env.NODE_ENV === 'development')`.

---

### Category 7: Testing Gaps

**What's solid:** 9 E2E test files exist covering auth, home page, species, observations, MPA detail, map, navigation, profile, and nearby flows. The Playwright config includes both desktop and mobile viewports (Pixel 5). Test fixtures handle authenticated flows. Screenshots and video capture on failure aid debugging.

---

#### 7.1 Zero unit tests for business logic

- **Priority:** P1
- **Status:** Not started
- **Problem:** No unit tests exist anywhere in the codebase. Critical logic is untested: health score calculations (`lib/health-score/indicator-species.ts`, `hooks/useCompositeHealthScore.ts`), observation validation, offline sync, data transformation (`lib/mpa-service.ts` `transformMPARow`), and the anti-meridian normalization just added to `components/Map/map-utils.ts`.
- **Solution:** Add Jest or Vitest with tests for: (1) `transformMPARow` data transformation, (2) health score calculation, (3) `normalizeAntimeridianGeometry`, (4) observation validation logic. These are pure functions and easy to test.

#### 7.2 E2E tests run against production only

- **Priority:** P2
- **Status:** Not started
- **Problem:** `playwright.config.ts` line 31: `baseURL: 'https://ocean-pulse-ochre.vercel.app'`. Tests can only run against the live production deployment. There is no staging environment and no ability to run tests locally against a dev server. Tests that create observations or modify data affect real production data.
- **Solution:** Add a staging Vercel deployment. Update Playwright config to use `process.env.BASE_URL || 'http://localhost:3000'`. Add a CI step that starts the dev server and runs tests before deploying.

#### 7.3 No automated dependency vulnerability scanning

- **Priority:** P2
- **Status:** Not started
- **Problem:** No `npm audit` step in CI. No Dependabot, Renovate, or Snyk configured. Vulnerable dependencies could ship unnoticed.
- **Solution:** Add `npm audit --audit-level=high` to the CI validate stage. Consider enabling GitLab's dependency scanning or adding Renovate for automated updates.

---

## 3. Verification Tracker

| # | Title | Priority | Status |
|---|-------|----------|--------|
| 1.1 | FK constraints dropped, never re-added | P1 | Done (migration 006) |
| 1.2 | Non-atomic observation + health assessment creation | P1 | Done (migration 007 + RPC) |
| 1.3 | Non-atomic delete (assessments then observation) | P2 | Done (migration 008 CASCADE) |
| 1.4 | No write policies on core data tables (verify) | P0 | Verified (no client writes) |
| 2.1 | Open redirect in OAuth callback | P0 | Done |
| 2.2 | No security headers (CSP, HSTS, X-Frame-Options) | P0 | Done |
| 2.3 | No rate limiting on API routes | P0 | Done |
| 2.4 | API routes not authenticated | P1 | Done (GFW auth-gated, SST rate-limited only) |
| 2.5 | GFW API token exposed in health check | P1 | Done (tokenPreview removed) |
| 2.6 | Photo upload lacks server-side validation | P1 | Done (UUID, size, magic bytes) |
| 2.7 | Sentry replay captures unmasked text | P1 | Done |
| 2.8 | CORS wildcard on SST tile endpoint | P2 | Done (production domain) |
| 2.9 | Server-side route protection commented out | P2 | Done (middleware redirect) |
| 3.1 | Sentry not wired up in API routes or service layer | P0 | Done |
| 3.2 | No request timeouts on OBIS/Copernicus/data-service | P1 | Done (fetchWithTimeout 30s) |
| 3.3 | No health check endpoint | P1 | Done (/api/health) |
| 3.4 | Silent failures indistinguishable from empty data | P2 | Done (services re-throw) |
| 3.5 | Offline sync never triggers automatically | P1 | Done (OfflineSync component) |
| 4.1 | No account deletion (GDPR Article 17) | P0 | Done |
| 4.2 | No data export (GDPR Article 20) | P0 | Done |
| 4.3 | No email service for GDPR acknowledgment | P1 | Process (manual for beta) |
| 4.4 | Data Processing Agreements not documented | P1 | Not verified |
| 4.5 | No Terms of Service acceptance tracking | P1 | Done (ToSAcceptance component) |
| 4.6 | No data retention enforcement | P2 | Done (migration 010 + cron) |
| 5.1 | No structured logging | P1 | Done (debug logs removed) |
| 5.2 | No uptime monitoring | P1 | Not started (external service) |
| 5.3 | Database backup verification | P1 | Not verified |
| 5.4 | CI pipeline missing lint and type-check | P2 | Done (validate stage) |
| 5.5 | Deploy stage disabled/undocumented | P2 | Done (documented) |
| 6.1 | Client-side distance calculation | P2 | Done (migration 009 PostGIS) |
| 6.2 | No server-side pagination on MPA list | P2 | Deferred (not needed for beta) |
| 6.3 | Debug console.log in hot paths | P2 | Done (removed in 5.1) |
| 7.1 | Zero unit tests for business logic | P1 | Done (57 tests, Vitest) |
| 7.2 | E2E tests run against production only | P2 | Done (env var + webServer) |
| 7.3 | No automated dependency vulnerability scanning | P2 | Done (npm audit in CI) |

---

## 4. Recommended Implementation Order

### Phase 1: Security and legal blockers (P0 items)

These must be done before any real user touches the system. They can largely be parallelized.

**Track A: Security hardening**
1. **2.1** Fix open redirect in OAuth callback (5 min, single file change)
2. **2.2** Add security headers in `next.config.js` (1 hr, iterate on CSP with report-only mode)
3. **2.3** Add rate limiting to `/api/gfw` and `/api/sst-tile` (2-4 hr depending on approach)

**Track B: Observability**
4. **3.1** Wire Sentry into API routes and service layer (2 hr, mechanical change across files)
5. **1.4** Verify no client-side writes to core data tables (30 min grep audit)

**Track C: GDPR compliance**
6. **4.1** Build account deletion API + UI (4-6 hr: API route, profile page button, confirmation dialog)
7. **4.2** Build data export API + UI (3-4 hr: API route, profile page button, JSON response)

### Phase 2: Reliability and compliance (P1 items)

These should be completed before scaling past ~20 users.

**Group 1: Data integrity** (depends on Phase 1 completion)
- **1.1** Re-add FK constraints (migration + data audit)
- **1.2** Create atomic Postgres function for observation+assessment

**Group 2: Security tightening**
- **2.4** Add auth checks to API routes
- **2.5** Remove token preview from GFW health check
- **2.6** Add photo upload validation
- **2.7** Fix Sentry replay masking (1 min config change; do this immediately)

**Group 3: Resilience**
- **3.2** Add request timeouts to all external API calls
- **3.3** Create `/api/health` endpoint
- **3.5** Implement automatic offline sync

**Group 4: Compliance and ops**
- **4.3** Establish GDPR request handling process
- **4.4** Sign DPAs with sub-processors
- **4.5** Add ToS acceptance interstitial
- **5.1** Clean up debug logging, gate behind NODE_ENV
- **5.2** Set up uptime monitoring
- **5.3** Verify database backups
- **7.1** Add unit tests for core business logic

### Phase 3: Polish and scale readiness (P2 items)

These can be addressed within the first month of beta.

- **1.3** Atomic deletes via FK cascade
- **2.8** Restrict CORS on SST tile endpoint
- **2.9** Enable server-side route protection
- **3.4** Distinguish API errors from empty data in UI
- **4.6** Implement data retention cleanup job
- **5.4** Add lint/type-check to CI
- **5.5** Document deployment mechanism
- **6.1** Move distance calculation to PostGIS
- **6.2** Add pagination for MPA queries
- **6.3** Remove debug console.log from production
- **7.2** Set up staging environment for E2E tests
- **7.3** Add dependency vulnerability scanning to CI
