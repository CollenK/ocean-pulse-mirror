# Production Readiness Audit

**Date:** 2026-03-11
**Scope:** Full codebase audit for closed beta launch targeting EU and western-country users
**Last updated:** 2026-03-11

---

## Status Overview

**31 of 35 findings resolved.** 4 remaining items require manual/external action (no code changes).

### Outstanding Items (manual action required)

| # | Title | Priority | Action needed |
|---|-------|----------|---------------|
| 4.3 | GDPR email acknowledgment | P1 | Set up a manual tracking spreadsheet for GDPR requests. Before scaling, integrate an email service (SendGrid, Resend) for automated acknowledgments. |
| 4.4 | Data Processing Agreements | P1 | Sign DPAs with Supabase, Vercel, Google (GA), and Sentry. Add a sub-processor list to the privacy policy. |
| 5.2 | Uptime monitoring | P1 | Register `/api/health` with UptimeRobot or Better Uptime. Configure alerts via email or Slack. |
| 5.3 | Database backup verification | P1 | Verify Supabase plan includes point-in-time recovery. Test a backup restore to a separate project. Document the restore procedure. |

### Deferred

| # | Title | Priority | Reason |
|---|-------|----------|--------|
| 6.2 | Server-side MPA pagination | P2 | Not needed with ~200 MPAs in beta. Add before count exceeds ~500. |

---

## Completed Items

### P0: Security and Legal Blockers (all done)

| # | Title | Resolution |
|---|-------|------------|
| 1.4 | Core table write policies | Verified: no client-side writes to `mpas`, `environmental_data`, `species_data`, `health_scores` |
| 2.1 | Open redirect in OAuth callback | `app/auth/callback/route.ts`: validates `next` param is relative path, rejects `//` prefix |
| 2.2 | Security headers | `next.config.js`: added CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| 2.3 | Rate limiting on API routes | `lib/rate-limit.ts`: sliding window limiter. GFW: 30 req/min, SST: 120 req/min per IP |
| 3.1 | Sentry in API routes + services | `lib/error-reporting.ts`: `captureError()` wrapper. Wired into GFW route, SST route, observations-service, mpa-service |
| 4.1 | GDPR account deletion | `app/api/gdpr/delete-account/route.ts`: cascading deletion. Profile page "Delete Account" button with `DELETE` confirmation |
| 4.2 | GDPR data export | `app/api/gdpr/export/route.ts`: JSON download of all user data. Profile page "Download My Data" button |

### P1: Reliability and Compliance (all code items done)

| # | Title | Resolution |
|---|-------|------------|
| 1.1 | FK constraints re-added | `supabase/migrations/006_readd_fk_constraints.sql`: UNIQUE on `mpas.external_id`, FKs with CASCADE. Orphan cleanup before constraint. |
| 1.2 | Atomic observation creation | `supabase/migrations/007_atomic_observation_creation.sql`: `create_observation_with_health()` Postgres function. Service uses `supabase.rpc()`. |
| 2.4 | API route authentication | GFW route requires Supabase auth. SST tiles kept public (rate-limited, public Copernicus data). |
| 2.5 | Token preview removed | GFW health check returns only `configured: true/false`, no token characters. |
| 2.6 | Photo upload validation | UUID check on userId, 5MB size limit, JPEG/PNG magic byte validation, dynamic content type. |
| 2.7 | Sentry replay masking | `sentry.client.config.ts`: `maskAllText: true`, `blockAllMedia: true` |
| 3.2 | Request timeouts | `lib/fetch-with-timeout.ts`: 30s default. Applied to OBIS (4 files), data-service, SST tile (15s). |
| 3.3 | Health check endpoint | `app/api/health/route.ts`: checks Supabase connectivity + GFW config. Returns `healthy`/`degraded`. |
| 3.5 | Automatic offline sync | `components/OfflineSync.tsx`: syncs on reconnection + every 5 min. Rendered in Providers. |
| 4.5 | ToS acceptance tracking | `components/ToSAcceptance.tsx`: interstitial after first login. Stores version + timestamp in `profiles.preferences`. |
| 5.1 | Debug logging cleanup | Removed all `PAGE DEBUG`, `MAP DEBUG`, `GBR DEBUG`, and GFW POST debug logs from production code. |
| 7.1 | Unit tests | Vitest setup with 57 tests across `map-utils.test.ts`, `health-score.test.ts`, `abundance.test.ts`. `npm run test:unit`. |

### P2: Polish and Scale Readiness (all code items done)

| # | Title | Resolution |
|---|-------|------------|
| 1.3 | Atomic delete via CASCADE | `supabase/migrations/008_cascade_observation_delete.sql`: FK on `observation_id` changed to `ON DELETE CASCADE`. Simplified service code. |
| 2.8 | CORS restriction | SST tile `Access-Control-Allow-Origin` set to production domain instead of `*`. |
| 2.9 | Server-side route protection | `lib/supabase/middleware.ts`: redirects unauthenticated users from `/observe`, `/profile`, `/saved` to `/login`. |
| 3.4 | Error vs empty data | `lib/mpa-service.ts`: `fetchAllMPAs`, `fetchMPAById`, `searchMPAs`, `fetchMPAGeometries` re-throw errors. Callers handle gracefully. |
| 4.6 | Data retention enforcement | `supabase/migrations/010_draft_retention_cleanup.sql`: `cleanup_old_drafts()` function. `app/api/cron/cleanup/route.ts` + `vercel.json` cron (daily 3am). |
| 5.4 | CI validate stage | `.gitlab-ci.yml`: `validate` stage runs `type-check` + `test:unit` before build. Runs on main + MRs. |
| 5.5 | Deployment documented | `.gitlab-ci.yml`: documented Vercel GitLab integration as deployment mechanism. |
| 6.1 | PostGIS distance | `supabase/migrations/009_postgis_nearest_mpas.sql`: `find_nearest_mpas()` using `ST_DWithin`. Service uses RPC. |
| 6.3 | Debug console.log removed | Completed as part of 5.1. |
| 7.2 | Local E2E tests | `playwright.config.ts`: `PLAYWRIGHT_BASE_URL` env var + `webServer` auto-starts dev server locally. |
| 7.3 | Dependency vulnerability scanning | `.gitlab-ci.yml`: `security-audit` job runs `npm audit --audit-level=high` (allow_failure). |

---

## New Files Created

| File | Purpose |
|------|---------|
| `lib/rate-limit.ts` | Sliding window rate limiter for API routes |
| `lib/error-reporting.ts` | `captureError()` wrapper for console.error + Sentry |
| `lib/fetch-with-timeout.ts` | `fetchWithTimeout()` with AbortController |
| `app/api/health/route.ts` | Health check endpoint for uptime monitoring |
| `app/api/gdpr/delete-account/route.ts` | GDPR Article 17 account deletion |
| `app/api/gdpr/export/route.ts` | GDPR Article 20 data export |
| `app/api/cron/cleanup/route.ts` | Daily draft observation cleanup |
| `components/OfflineSync.tsx` | Automatic offline-to-online sync |
| `components/ToSAcceptance.tsx` | ToS/Privacy acceptance interstitial |
| `vitest.config.ts` | Vitest test runner configuration |
| `vercel.json` | Vercel cron schedule |
| `lib/__tests__/map-utils.test.ts` | Unit tests for map utilities |
| `lib/__tests__/health-score.test.ts` | Unit tests for health score calculations |
| `lib/__tests__/abundance.test.ts` | Unit tests for abundance data processing |
| `supabase/migrations/006_readd_fk_constraints.sql` | Re-add FK constraints with orphan cleanup |
| `supabase/migrations/007_atomic_observation_creation.sql` | Atomic observation + health assessment function |
| `supabase/migrations/008_cascade_observation_delete.sql` | CASCADE delete on observation_id FK |
| `supabase/migrations/009_postgis_nearest_mpas.sql` | PostGIS nearest MPA function |
| `supabase/migrations/010_draft_retention_cleanup.sql` | Draft cleanup function |

---

## Original Findings Reference

The detailed problem descriptions and analysis for each finding are preserved below for reference.

### Category 1: Data Integrity & Multi-Tenancy

**What's solid:** RLS is enabled on all tables. User-scoped data (observations, saved MPAs, health assessments, profiles) is properly gated by `auth.uid() = user_id` policies. Service role policies are scoped to data ingestion tables only. Supabase handles parameterized queries, eliminating SQL injection. The `ON DELETE CASCADE` on saved_mpas ensures cleanup when users or MPAs are removed.

#### 1.1 Foreign key constraints dropped and never re-added

- **Priority:** P1
- **Status:** Done
- **Problem:** Migration `003_fix_mpa_id_type.sql` drops FK constraints on `observations.mpa_id` and `user_health_assessments.mpa_id` to change the column type from UUID to TEXT. The constraints were never re-created, allowing orphaned data.
- **Resolution:** Migration 006 adds UNIQUE constraint on `mpas.external_id`, cleans up orphaned rows, then re-adds FK constraints with `ON DELETE CASCADE`.

#### 1.2 Non-atomic observation + health assessment creation

- **Priority:** P1
- **Status:** Done
- **Problem:** Two separate inserts (observation then health assessment) with no transaction wrapping.
- **Resolution:** Migration 007 creates `create_observation_with_health()` Postgres function. Service calls it via `supabase.rpc()`.

#### 1.3 Non-atomic delete (health assessments then observation)

- **Priority:** P2
- **Status:** Done
- **Problem:** Deleting health assessments before the observation risked orphaned state on failure.
- **Resolution:** Migration 008 changes FK on `user_health_assessments.observation_id` to `ON DELETE CASCADE`. Service simplified to single observation delete.

#### 1.4 No write policies on core data tables for anon key

- **Priority:** P0
- **Status:** Verified
- **Problem:** Needed to verify no client-side code writes to `mpas`, `environmental_data`, `species_data`, `health_scores`.
- **Resolution:** Grep audit confirmed no client writes. RLS INSERT/UPDATE policies only exist for `service_role`.

---

### Category 2: Security

**What's solid:** Supabase handles session management with HTTP-only cookies via `@supabase/ssr`. The PKCE OAuth flow is used. Sentry filters sensitive query params (`code`, `token`) before sending. The GFW API token is server-side only, never in `NEXT_PUBLIC_*` variables. `.env` is in `.gitignore`.

#### 2.1 Open redirect in OAuth callback

- **Priority:** P0
- **Status:** Done
- **Problem:** `next` query parameter was not validated, allowing redirect to external sites.
- **Resolution:** Added validation: `next` must start with `/` and not `//`.

#### 2.2 No security headers

- **Priority:** P0
- **Status:** Done
- **Problem:** No CSP, HSTS, X-Frame-Options, or other security headers configured.
- **Resolution:** Added `headers()` function in `next.config.js` with all standard security headers.

#### 2.3 No rate limiting on API routes

- **Priority:** P0
- **Status:** Done
- **Problem:** API proxy routes had no rate limiting, risking quota exhaustion.
- **Resolution:** Created `lib/rate-limit.ts` with sliding window limiter. GFW: 30/min, SST: 120/min per IP.

#### 2.4 API routes not authenticated

- **Priority:** P1
- **Status:** Done
- **Problem:** API routes accepted unauthenticated requests.
- **Resolution:** GFW route requires Supabase auth. SST tiles kept public (rate-limited, data is public).

#### 2.5 GFW API token partially exposed in health check

- **Priority:** P1
- **Status:** Done
- **Problem:** Health check returned first 10 and last 5 characters of the API token.
- **Resolution:** Removed `tokenPreview`. Health check returns only `configured: true/false`.

#### 2.6 Photo upload lacks server-side validation

- **Priority:** P1
- **Status:** Done
- **Problem:** No size limit, no MIME validation, no userId validation on uploads.
- **Resolution:** Added UUID validation, 5MB size limit, JPEG/PNG magic byte checks, dynamic content type.

#### 2.7 Sentry session replay captures unmasked text

- **Priority:** P1
- **Status:** Done
- **Problem:** Session replays captured all visible text and media (GDPR concern).
- **Resolution:** Set `maskAllText: true` and `blockAllMedia: true` in Sentry replay config.

#### 2.8 CORS wildcard on SST tile endpoint

- **Priority:** P2
- **Status:** Done
- **Problem:** `Access-Control-Allow-Origin: *` allowed any site to proxy through the endpoint.
- **Resolution:** Set origin to production domain.

#### 2.9 Server-side route protection commented out

- **Priority:** P2
- **Status:** Done
- **Problem:** Protected routes relied on client-side auth checks only.
- **Resolution:** Middleware now redirects unauthenticated users from `/observe`, `/profile`, `/saved` to `/login`.

---

### Category 3: Error Handling & Resilience

**What's solid:** The GFW client has AbortController timeouts (60s), retry with exponential backoff (3 retries), and rate limit detection. The Movebank client has similar retry logic. The offline-first observation pattern gracefully falls back to IndexedDB.

#### 3.1 Sentry not wired up in API routes or service layer

- **Priority:** P0
- **Status:** Done
- **Problem:** `Sentry.captureException()` only called in ErrorBoundary. All service/API errors went to ephemeral console logs.
- **Resolution:** Created `lib/error-reporting.ts` with `captureError()`. Wired into all API routes and service functions.

#### 3.2 No request timeouts on external API calls

- **Priority:** P1
- **Status:** Done
- **Problem:** OBIS, Copernicus, and data-service calls used bare `fetch()` with no timeout.
- **Resolution:** Created `lib/fetch-with-timeout.ts` (30s default). Applied to 6 files, 14 fetch calls.

#### 3.3 No health check endpoint

- **Priority:** P1
- **Status:** Done
- **Problem:** No endpoint for uptime monitoring.
- **Resolution:** Created `/api/health` checking Supabase connectivity and GFW config.

#### 3.4 Silent failures indistinguishable from empty data

- **Priority:** P2
- **Status:** Done
- **Problem:** Services swallowed errors and returned empty arrays, indistinguishable from "no data."
- **Resolution:** Key service functions now re-throw after logging. TanStack Query surfaces error state. Direct callers handle gracefully.

#### 3.5 Offline sync never triggers automatically

- **Priority:** P1
- **Status:** Done
- **Problem:** Unsynced observations in IndexedDB were never automatically synced to Supabase.
- **Resolution:** Created `OfflineSync` component: syncs on reconnection and every 5 minutes while online.

---

### Category 4: Compliance & Legal (GDPR)

**What's solid:** Privacy policy and ToS exist. Cookie consent is well-implemented with accept/reject/customize, localStorage persistence, consent versioning, DNT respect. Google Analytics only loads after consent. RLS enforces data isolation.

#### 4.1 No account deletion (GDPR Article 17)

- **Priority:** P0
- **Status:** Done
- **Problem:** No mechanism to delete user accounts despite privacy policy promising it.
- **Resolution:** Created `/api/gdpr/delete-account` API route with cascading deletion. Added "Delete Account" button with `DELETE` confirmation to profile page.

#### 4.2 No data export (GDPR Article 20)

- **Priority:** P0
- **Status:** Done
- **Problem:** No data export mechanism despite privacy policy promising portability.
- **Resolution:** Created `/api/gdpr/export` returning JSON download. Added "Download My Data" button to profile page.

#### 4.3 No email service for GDPR request acknowledgment

- **Priority:** P1
- **Status:** Outstanding (manual process)
- **Action:** Set up a manual tracking spreadsheet for beta. Integrate email service before scaling.

#### 4.4 Data Processing Agreements not documented

- **Priority:** P1
- **Status:** Outstanding (legal action)
- **Action:** Sign DPAs with Supabase, Vercel, Google (GA), Sentry. Add sub-processor list to privacy policy.

#### 4.5 No Terms of Service acceptance tracking

- **Priority:** P1
- **Status:** Done
- **Problem:** Users never asked to accept ToS/Privacy during signup.
- **Resolution:** Created `ToSAcceptance` interstitial shown after first login. Stores version and timestamp in `profiles.preferences`.

#### 4.6 No data retention enforcement

- **Priority:** P2
- **Status:** Done
- **Problem:** Draft observations accumulated forever with no cleanup.
- **Resolution:** Migration 010 creates `cleanup_old_drafts()` function. Vercel cron runs daily at 3am UTC.

---

### Category 5: Observability & Operations

**What's solid:** Sentry configured for client, server, and edge runtimes with appropriate sample rates. Sentry config properly filters noisy browser errors and sensitive query params.

#### 5.1 No structured logging / debug logs in production

- **Priority:** P1
- **Status:** Done
- **Problem:** 111+ console statements including debug logs in hot paths.
- **Resolution:** Removed all `PAGE DEBUG`, `MAP DEBUG`, `GBR DEBUG`, and GFW POST debug logs.

#### 5.2 No uptime monitoring

- **Priority:** P1
- **Status:** Outstanding (external service)
- **Action:** Register `/api/health` with UptimeRobot or Better Uptime. Configure email/Slack alerts.

#### 5.3 No database backup verification

- **Priority:** P1
- **Status:** Outstanding (ops verification)
- **Action:** Verify Supabase plan includes point-in-time recovery. Test a restore. Document the procedure.

#### 5.4 CI pipeline missing lint and type-check

- **Priority:** P2
- **Status:** Done
- **Problem:** CI ran only build, not validation.
- **Resolution:** Added `validate` stage with `type-check` and `test:unit` before build. Runs on main and MRs.

#### 5.5 Deploy stage disabled/undocumented

- **Priority:** P2
- **Status:** Done
- **Problem:** Deployment mechanism was undocumented.
- **Resolution:** Documented Vercel GitLab integration in `.gitlab-ci.yml`.

---

### Category 6: Performance & Scale

**What's solid:** Dynamic imports for heavy components. TanStack Query client-side caching. PWA service worker caches map tiles, API responses, and fonts. PostGIS indexes on geometry columns.

#### 6.1 Client-side distance calculation instead of PostGIS

- **Priority:** P2
- **Status:** Done
- **Problem:** `findNearestMPAs()` fetched all MPAs and calculated distance in JavaScript.
- **Resolution:** Migration 009 creates `find_nearest_mpas()` PostGIS function using `ST_DWithin`. Service uses RPC.

#### 6.2 No server-side pagination on MPA list

- **Priority:** P2
- **Status:** Deferred
- **Reason:** Not needed with ~200 MPAs in beta. Add before count exceeds ~500.

#### 6.3 Debug console.log in hot paths

- **Priority:** P2
- **Status:** Done
- **Resolution:** Completed as part of 5.1.

---

### Category 7: Testing Gaps

**What's solid:** 9 E2E test files covering auth, home page, species, observations, MPA detail, map, navigation, profile, and nearby flows. Desktop and mobile viewports. Screenshots and video on failure.

#### 7.1 Zero unit tests for business logic

- **Priority:** P1
- **Status:** Done
- **Problem:** No unit tests existed anywhere in the codebase.
- **Resolution:** Vitest setup with 57 tests: `map-utils.test.ts` (15), `health-score.test.ts` (20), `abundance.test.ts` (22).

#### 7.2 E2E tests run against production only

- **Priority:** P2
- **Status:** Done
- **Problem:** Playwright hardcoded to production URL with no local option.
- **Resolution:** `PLAYWRIGHT_BASE_URL` env var with localhost default. `webServer` config auto-starts dev server locally.

#### 7.3 No automated dependency vulnerability scanning

- **Priority:** P2
- **Status:** Done
- **Problem:** No `npm audit` in CI.
- **Resolution:** `security-audit` job in CI runs `npm audit --audit-level=high` (allow_failure).
