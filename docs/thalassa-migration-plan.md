# Migration Plan: Thalassa Cloud

## Overview

Migrate Ocean PULSE from its current multi-vendor setup (Vercel, Railway, Supabase Cloud) to Thalassa Cloud, a European cloud provider based in the Netherlands. This consolidates all infrastructure onto a single EU-sovereign platform.

### Current Architecture

| Component | Current Provider | Service |
|-----------|-----------------|---------|
| Frontend (Next.js PWA) | Vercel | Managed hosting, Edge Functions, CDN |
| Backend (FastAPI) | Railway | Container hosting (has render.yaml too) |
| Database (PostgreSQL + PostGIS) | Supabase Cloud | Managed PostgreSQL 15, PostgREST, RLS |
| Authentication | Supabase Auth | Google OAuth, email/password, guest mode |
| File Storage | Supabase Storage | Observation photos |
| Error Tracking | Sentry | Client, server, and edge error capture |
| Analytics | Google Analytics | GA4 via gtag.js |
| CI/CD | GitLab CI | Migrations, builds |

### Target Architecture

| Component | Thalassa Service | Notes |
|-----------|-----------------|-------|
| Frontend (Next.js PWA) | Kubernetes (containerized) | Dockerized Next.js with NGINX ingress |
| Backend (FastAPI) | Kubernetes (containerized) | Already has Dockerfile |
| Database | PostgreSQL DBaaS | PostGIS 3.6.x supported natively |
| Authentication | See options below | Supabase Auth replacement needed |
| File Storage | S3-compatible Object Storage | For observation photos |
| Container Images | Thalassa Container Registry | `registry.nl-01.thalassa.cloud` |
| TLS Certificates | Cert Manager + Let's Encrypt | Automated via Kubernetes |
| Monitoring | Managed Prometheus | Replaces basic health checks |
| CI/CD | GitLab CI (updated) | Push to Thalassa Container Registry, kubectl deploy |
| Error Tracking | Sentry (unchanged) | SaaS, no migration needed |
| Analytics | Google Analytics (unchanged) | SaaS, no migration needed |

### Motivation

- **EU data sovereignty**: All data stored in Netherlands, GDPR-compliant by infrastructure
- **Cost optimization**: Consolidate three platform subscriptions into one
- **Partnership**: Strategic alignment with Thalassa Cloud

---

## Key Decisions Required

### Decision 1: Authentication Strategy

Supabase Auth currently provides Google OAuth, email/password login, guest mode, JWT tokens, and session management via middleware. Thalassa Cloud does not offer a managed auth service. Three options:

#### Option A: Self-hosted Supabase on Kubernetes (Recommended)

Deploy the open-source Supabase stack (GoTrue auth server, PostgREST, Realtime) on Thalassa Kubernetes, pointed at the Thalassa PostgreSQL DBaaS instance.

**Pros:**
- Zero frontend code changes (keep `@supabase/supabase-js` client as-is)
- All existing RLS policies, auth flows, and middleware continue working
- Preserves PostgREST API layer the frontend depends on
- Supabase has official Docker/Helm deployment guides

**Cons:**
- More infrastructure to manage (GoTrue, PostgREST, Kong/API gateway)
- Must handle upgrades and security patches yourself
- Supabase self-hosted is a complex stack (~10 containers)

**Effort:** Medium-high. Most complexity is in initial setup; ongoing maintenance is moderate.

#### Option B: Keycloak + Direct PostgreSQL

Deploy Keycloak on Thalassa Kubernetes for auth. Rewrite the frontend to use OIDC instead of Supabase Auth. Replace PostgREST with direct database queries from the backend.

**Pros:**
- Industry-standard OIDC provider with wide ecosystem support
- Thalassa has a [Keycloak deployment guide](https://docs.thalassa.cloud/docs/kubernetes/guides/apps/deploy-keycloak/)
- Simpler long-term (fewer moving parts than self-hosted Supabase)

**Cons:**
- Significant frontend rewrite: replace all `@supabase/supabase-js` auth calls
- Must rewrite all data fetching: PostgREST queries become API calls to the FastAPI backend
- RLS policies become application-level authorization in the backend
- Longer migration timeline

**Effort:** High. Touches almost every file that interacts with Supabase.

#### Option C: Keep Supabase Cloud for Auth Only

Keep the Supabase Cloud project running solely for authentication. Migrate the database to Thalassa PostgreSQL and point the frontend's data queries at the FastAPI backend or directly at the Thalassa database.

**Pros:**
- No auth code changes
- Incremental migration (database first, auth later)

**Cons:**
- Defeats the goal of full EU sovereignty (Supabase Cloud runs on AWS)
- Still paying for Supabase
- Split architecture adds complexity

**Effort:** Low initially, but creates technical debt.

#### Recommendation

**Option A (self-hosted Supabase)** for the initial migration, since it requires zero frontend auth/data-fetching changes. This can be evolved to Option B later if the self-hosted Supabase overhead becomes burdensome.

---

### Decision 2: Frontend Deployment Strategy

#### Option A: Containerized on Thalassa Kubernetes (Recommended)

Dockerize the Next.js app and deploy as a Kubernetes Deployment with NGINX ingress and Let's Encrypt TLS.

**Pros:**
- Full EU sovereignty, single platform
- Full control over caching, headers, routing
- No vendor lock-in to Vercel-specific features

**Cons:**
- Lose Vercel's edge network/CDN (add Cloudflare or similar if needed)
- Lose Vercel's zero-config deployments (must write Dockerfile + K8s manifests)
- Lose automatic preview deployments per PR (can replicate with CI/CD but more effort)
- Next.js `output: 'standalone'` mode required (some Vercel-specific features may not work)

**Effort:** Medium. Dockerfile is straightforward; K8s manifests and CI/CD take more setup.

#### Option B: Keep Frontend on Vercel

Only migrate backend and database to Thalassa. Frontend stays on Vercel.

**Pros:**
- Zero frontend deployment changes
- Keep edge network, preview deploys, zero-config
- Faster migration overall

**Cons:**
- Frontend served from Vercel's infrastructure (not EU-sovereign)
- Still paying Vercel
- Cross-provider latency for API calls (Vercel edge -> Thalassa NL)

**Effort:** None for frontend; backend/DB migration only.

#### Recommendation

**Option A (containerized)** for full sovereignty. If CDN performance is a concern, add Cloudflare (free tier) in front of the Thalassa load balancer for edge caching of static assets.

---

## Migration Phases

### Phase 1: Thalassa Infrastructure Setup

Set up the foundational infrastructure on Thalassa Cloud before migrating any services.

#### 1.1 Create Thalassa Cloud account and project

- Sign up at thalassa.cloud
- Set up IAM: create a service account for CI/CD deployments
- Install `tcloud` CLI locally

#### 1.2 Provision Kubernetes cluster

```
Cluster: ocean-pulse-prod
Region: nl-01
Kubernetes version: latest stable (1.34.x)
Node pool: 2-3 nodes, medium instance (4 vCPU, 16 GB RAM)
Autoscaling: enabled (min 2, max 5)
```

- Install NGINX Ingress Controller via Helm
- Install Cert Manager via Helm for Let's Encrypt TLS
- Configure ClusterIssuer for Let's Encrypt production

#### 1.3 Provision PostgreSQL DBaaS

```
Instance type: db-pgp.medium (2 vCPU, 4 GB RAM) or larger
PostgreSQL version: 17.6 (latest supported)
High availability: enabled (multi-AZ)
Automated backups: enabled
```

After provisioning:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

#### 1.4 Set up Object Storage

Create an S3-compatible bucket for observation photos and user uploads:
```
Bucket: ocean-pulse-uploads
Region: nl-01
Versioning: enabled
```

Create a service account with read/write access for the application.

#### 1.5 Set up Container Registry

Create a namespace in the Thalassa Container Registry:
```
Registry: registry.nl-01.thalassa.cloud
Namespace: ocean-pulse
```

Create a service account for CI/CD image pushes.

#### 1.6 Configure DNS

Point application domains to the Kubernetes load balancer IP:
```
app.oceanpulse.org      -> Load Balancer IP (A record)
api.oceanpulse.org      -> Load Balancer IP (A record)
```

(Adjust domains to whatever is actually used.)

---

### Phase 2: Database Migration

#### 2.1 Export Supabase database

```bash
# Full schema + data export from Supabase
pg_dump --host=db.oftyqrsmirvzmxpbmucd.supabase.co \
  --port=5432 \
  --username=postgres \
  --format=custom \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=realtime \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=pgsodium \
  --exclude-schema=vault \
  -f ocean_pulse_backup.dump \
  postgres
```

Note: Exclude Supabase-internal schemas. The `auth` and `storage` schemas are handled separately depending on the auth strategy chosen.

#### 2.2 Import into Thalassa PostgreSQL

```bash
# Restore to Thalassa PostgreSQL
pg_restore --host=<thalassa-pg-host> \
  --port=5432 \
  --username=<thalassa-pg-user> \
  --dbname=ocean_pulse \
  --no-owner \
  --no-privileges \
  ocean_pulse_backup.dump
```

#### 2.3 Verify data integrity

- Verify row counts match for all tables (`mpas`, `observations`, `profiles`, etc.)
- Test PostGIS spatial queries: `SELECT ST_AsText(geometry) FROM mpas LIMIT 1;`
- Verify indexes are intact: `\di` in psql
- Run a sample of application queries to verify performance

#### 2.4 Re-apply RLS policies

If using self-hosted Supabase (Option A), RLS policies transfer automatically since they are standard PostgreSQL. If using Keycloak (Option B), RLS policies should be removed and replaced with application-level authorization in the backend.

---

### Phase 3: Backend Migration (FastAPI)

The Python backend already has a Dockerfile, making this the simplest migration.

#### 3.1 Push image to Thalassa Container Registry

```bash
# Build and tag
docker build -t registry.nl-01.thalassa.cloud/ocean-pulse/data-service:latest \
  apps/data-service/

# Login and push
docker login registry.nl-01.thalassa.cloud
docker push registry.nl-01.thalassa.cloud/ocean-pulse/data-service:latest
```

#### 3.2 Create Kubernetes manifests

Create `k8s/data-service/` directory with:

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-service
  namespace: ocean-pulse
spec:
  replicas: 2
  selector:
    matchLabels:
      app: data-service
  template:
    metadata:
      labels:
        app: data-service
    spec:
      containers:
        - name: data-service
          image: registry.nl-01.thalassa.cloud/ocean-pulse/data-service:latest
          ports:
            - containerPort: 8000
          envFrom:
            - secretRef:
                name: data-service-secrets
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
```

**service.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: data-service
  namespace: ocean-pulse
spec:
  selector:
    app: data-service
  ports:
    - port: 80
      targetPort: 8000
```

**ingress.yaml:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: data-service
  namespace: ocean-pulse
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.oceanpulse.org
      secretName: data-service-tls
  rules:
    - host: api.oceanpulse.org
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: data-service
                port:
                  number: 80
```

**secrets.yaml** (template, actual values via CI/CD or sealed secrets):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: data-service-secrets
  namespace: ocean-pulse
type: Opaque
stringData:
  DEBUG: "false"
  CORS_ORIGINS: '["https://app.oceanpulse.org"]'
  COPERNICUS_USERNAME: "<value>"
  COPERNICUS_PASSWORD: "<value>"
  DATABASE_URL: "postgresql://<user>:<pass>@<thalassa-pg-host>:5432/ocean_pulse"
```

#### 3.3 Deploy and verify

```bash
kubectl apply -f k8s/data-service/
kubectl get pods -n ocean-pulse
curl https://api.oceanpulse.org/health
```

#### 3.4 Update CORS origins

Update the FastAPI CORS configuration in `apps/data-service/app/config.py` to allow the new frontend domain.

---

### Phase 4: Frontend Migration (Next.js)

#### 4.1 Create Dockerfile for Next.js

Create `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for public env vars (baked into the client bundle)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_DATA_SERVICE_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_DATA_SERVICE_URL=$NEXT_PUBLIC_DATA_SERVICE_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### 4.2 Update next.config.js

Add `output: 'standalone'` for Docker builds:

```js
const nextConfig = {
  output: 'standalone',
  // ... existing config
};
```

#### 4.3 Create Kubernetes manifests

Create `k8s/frontend/` with deployment, service, and ingress manifests (same pattern as the data service but with port 3000 and the app domain).

#### 4.4 Handle environment variables

`NEXT_PUBLIC_*` variables are baked in at build time, so they must be passed as build args when building the Docker image. Server-side env vars (Sentry auth token, etc.) are provided via Kubernetes secrets at runtime.

#### 4.5 PWA considerations

- Service worker and manifest.json are served as static files from the Next.js container
- Ensure the Kubernetes ingress passes through the correct `Content-Type` headers for `.webmanifest` files
- Test PWA install flow after deployment

---

### Phase 5: Auth Migration (if self-hosting Supabase)

This phase applies only if Option A (self-hosted Supabase) is chosen.

#### 5.1 Deploy self-hosted Supabase services

The core Supabase services needed:

| Service | Purpose | Required? |
|---------|---------|-----------|
| GoTrue | Auth server (JWT, OAuth, email) | Yes |
| PostgREST | Auto-generated REST API from PostgreSQL | Yes |
| Kong / API Gateway | Routes requests to GoTrue and PostgREST | Yes |
| Supabase Studio | Admin dashboard | Optional |
| Realtime | WebSocket subscriptions | Not currently used |
| Storage API | File uploads | Replace with S3 (see Phase 6) |

Use the official [supabase/supabase](https://github.com/supabase/supabase) Docker Compose as a reference, but deploy on Kubernetes with Helm or raw manifests.

Key configuration:
- Point GoTrue and PostgREST at the Thalassa PostgreSQL instance
- Configure GoTrue with Google OAuth credentials (same as current Supabase project)
- Set the `GOTRUE_SITE_URL` to the new frontend domain
- Set `GOTRUE_URI_ALLOW_LIST` to include the new callback URL
- Generate new JWT secret and anon/service_role keys

#### 5.2 Migrate auth data

Export users from Supabase Cloud:
```sql
-- From Supabase Cloud
SELECT * FROM auth.users;
SELECT * FROM auth.identities;
SELECT * FROM auth.sessions;
```

Import into the self-hosted GoTrue database (same PostgreSQL instance on Thalassa).

#### 5.3 Update frontend configuration

Update environment variables to point at the self-hosted Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.oceanpulse.org
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
```

The `@supabase/supabase-js` client will work identically since the API surface is the same.

#### 5.4 Update OAuth callback

Update the Google Cloud Console OAuth configuration:
- Add new authorized redirect URI: `https://supabase.oceanpulse.org/auth/v1/callback`
- Keep the old Supabase Cloud URI active during transition

---

### Phase 6: Storage Migration

#### 6.1 Migrate observation photos

If Supabase Storage contains uploaded files (observation photos), migrate them to Thalassa S3-compatible Object Storage:

```bash
# List and download from Supabase Storage
# (use supabase CLI or direct API calls)

# Upload to Thalassa S3
aws s3 sync ./downloads s3://ocean-pulse-uploads/ \
  --endpoint-url https://objectstorage.nl-01.thalassa.cloud
```

#### 6.2 Update file upload code

Replace Supabase Storage SDK calls with S3-compatible operations. Use the `@aws-sdk/client-s3` package or a presigned URL approach:

```typescript
// Before (Supabase Storage)
const { data } = await supabase.storage
  .from('observations')
  .upload(path, file);

// After (S3-compatible)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'https://objectstorage.nl-01.thalassa.cloud',
  region: 'nl-01',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

await s3.send(new PutObjectCommand({
  Bucket: 'ocean-pulse-uploads',
  Key: path,
  Body: file,
}));
```

Alternatively, if using self-hosted Supabase (Option A), the Supabase Storage API can be configured to use Thalassa S3 as its backend, preserving the existing SDK calls.

---

### Phase 7: CI/CD Pipeline Update

#### 7.1 Update `.gitlab-ci.yml`

```yaml
stages:
  - test
  - build
  - deploy

variables:
  REGISTRY: registry.nl-01.thalassa.cloud/ocean-pulse
  KUBECONFIG_FILE: $KUBECONFIG  # Stored as GitLab CI variable

# Build and push frontend image
build-frontend:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $THALASSA_REGISTRY_USER -p $THALASSA_REGISTRY_PASS registry.nl-01.thalassa.cloud
    - docker build
        --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
        --build-arg NEXT_PUBLIC_DATA_SERVICE_URL=$NEXT_PUBLIC_DATA_SERVICE_URL
        --build-arg NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
        -t $REGISTRY/frontend:$CI_COMMIT_SHORT_SHA
        -t $REGISTRY/frontend:latest .
    - docker push $REGISTRY/frontend:$CI_COMMIT_SHORT_SHA
    - docker push $REGISTRY/frontend:latest
  only:
    - main

# Build and push backend image
build-backend:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $THALASSA_REGISTRY_USER -p $THALASSA_REGISTRY_PASS registry.nl-01.thalassa.cloud
    - docker build
        -t $REGISTRY/data-service:$CI_COMMIT_SHORT_SHA
        -t $REGISTRY/data-service:latest
        apps/data-service/
    - docker push $REGISTRY/data-service:$CI_COMMIT_SHORT_SHA
    - docker push $REGISTRY/data-service:latest
  only:
    - main

# Deploy to Thalassa Kubernetes
deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/frontend frontend=$REGISTRY/frontend:$CI_COMMIT_SHORT_SHA -n ocean-pulse
    - kubectl set image deployment/data-service data-service=$REGISTRY/data-service:$CI_COMMIT_SHORT_SHA -n ocean-pulse
    - kubectl rollout status deployment/frontend -n ocean-pulse --timeout=300s
    - kubectl rollout status deployment/data-service -n ocean-pulse --timeout=300s
  only:
    - main
```

#### 7.2 GitLab CI variables to configure

| Variable | Description |
|----------|-------------|
| `THALASSA_REGISTRY_USER` | Container Registry service account username |
| `THALASSA_REGISTRY_PASS` | Container Registry service account password |
| `KUBECONFIG` | Kubernetes cluster config (file type variable) |
| `NEXT_PUBLIC_SUPABASE_URL` | Self-hosted Supabase URL or Thalassa PG connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_DATA_SERVICE_URL` | `https://api.oceanpulse.org` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID |

---

### Phase 8: Monitoring and Observability

#### 8.1 Managed Prometheus

Thalassa provides Managed Prometheus. Configure scraping for:

- Next.js app (custom `/metrics` endpoint or default Node.js metrics)
- FastAPI backend (add `prometheus-fastapi-instrumentator` package)
- PostgreSQL (via `postgres_exporter`)
- Kubernetes node and pod metrics (built-in)

#### 8.2 Sentry (unchanged)

Sentry is a SaaS product and does not need migration. Keep the existing Sentry DSN and configuration. The only change is ensuring the Sentry source map upload step in CI/CD works from the new build pipeline.

#### 8.3 Alerting

Set up Prometheus alerting rules for:
- Pod restart loops
- High error rates (5xx responses)
- Database connection failures
- Pipeline run failures (data pipeline cron)
- Storage usage thresholds

---

### Phase 9: Data Pipeline Cron Job

The server-side data pipeline (see `docs/server-side-data-pipeline.md`) needs a scheduling mechanism. On Thalassa Kubernetes, use a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-pipeline
  namespace: ocean-pulse
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: pipeline
              image: registry.nl-01.thalassa.cloud/ocean-pulse/data-service:latest
              command: ["python", "-m", "app.pipeline_runner"]
              envFrom:
                - secretRef:
                    name: data-service-secrets
          restartPolicy: OnFailure
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
```

This replaces the Railway Cron option from the pipeline plan.

---

## Migration Order and Dependencies

```
Phase 1: Infrastructure Setup
    |
    v
Phase 2: Database Migration --------+
    |                                |
    v                                v
Phase 3: Backend Migration     Phase 5: Auth Migration
    |                                |
    +--------------------------------+
    |
    v
Phase 4: Frontend Migration
    |
    v
Phase 6: Storage Migration
    |
    v
Phase 7: CI/CD Pipeline Update
    |
    v
Phase 8: Monitoring Setup
    |
    v
Phase 9: Data Pipeline Cron
    |
    v
DNS Cutover & Decommission Old Services
```

Phases 2, 3, and 5 can run in parallel after Phase 1 is complete.

---

## Rollback Strategy

1. **Keep old services running** during the entire migration. Do not decommission Vercel, Railway, or Supabase until the new stack has been stable for at least 2 weeks.
2. **DNS-based cutover**: Use DNS to switch traffic. If issues arise, point DNS back to the old infrastructure within minutes.
3. **Database sync**: During the transition period, consider running a logical replication stream from Thalassa PostgreSQL back to Supabase (or vice versa) so both databases stay in sync.
4. **Feature flag**: Add an environment variable that toggles between old and new backends, so individual services can be rolled back independently.

---

## Estimated Cost Comparison

| Service | Current (estimated) | Thalassa (estimated) |
|---------|-------------------|---------------------|
| Vercel (Pro) | ~$20/mo | -- |
| Railway | ~$5-20/mo | -- |
| Supabase (Pro) | ~$25/mo | -- |
| Thalassa K8s (2 nodes medium) | -- | ~$260/mo |
| Thalassa PostgreSQL (medium) | -- | ~$26/mo |
| Thalassa Object Storage | -- | ~$5/mo |
| Thalassa Load Balancer | -- | ~$18/mo |
| Thalassa Container Registry | -- | Included |
| **Total** | **~$50-65/mo** | **~$309/mo** |

Note: Thalassa costs are higher for raw infrastructure because Vercel/Railway/Supabase have generous free/hobby tiers. The trade-off is full EU sovereignty, no vendor lock-in, and partnership value. Costs can be optimized by:
- Using smaller K8s nodes (2 vCPU, 4 GB) if traffic is low
- Starting with a single K8s node and scaling later
- Using the smallest PostgreSQL instance tier

---

## Post-Migration Cleanup

After the new stack has been stable for 2+ weeks:

1. Cancel Vercel Pro subscription
2. Delete Railway project
3. Pause or delete Supabase project (export final backup first)
4. Remove old deployment configs: `apps/data-service/render.yaml`
5. Update `CLAUDE.md` and project documentation to reflect new infrastructure
6. Update `.env.example` files with new variable names/values
7. Remove any Vercel-specific code or configurations
8. Update the `CORS_ORIGINS` in the backend to only include the new domain

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `Dockerfile` (root) | Next.js container build |
| `k8s/namespace.yaml` | Kubernetes namespace |
| `k8s/frontend/deployment.yaml` | Frontend deployment |
| `k8s/frontend/service.yaml` | Frontend service |
| `k8s/frontend/ingress.yaml` | Frontend ingress + TLS |
| `k8s/data-service/deployment.yaml` | Backend deployment |
| `k8s/data-service/service.yaml` | Backend service |
| `k8s/data-service/ingress.yaml` | Backend ingress + TLS |
| `k8s/data-service/cronjob.yaml` | Data pipeline cron |
| `k8s/secrets/` | Secret templates |
| `.dockerignore` | Exclude node_modules, .git, etc. |

### Modified Files

| File | Change |
|------|--------|
| `next.config.js` | Add `output: 'standalone'` |
| `.gitlab-ci.yml` | New build + deploy pipeline for Thalassa |
| `apps/data-service/app/config.py` | Update CORS origins |
| `.env.example` | Update with new env var structure |
| `lib/supabase/client.ts` | Update if Supabase URL changes |
| `lib/supabase/server.ts` | Update if Supabase URL changes |
| `app/auth/callback/route.ts` | Update callback URL if domain changes |

### Files to Remove (post-migration)

| File | Reason |
|------|--------|
| `apps/data-service/render.yaml` | No longer deploying to Render |
