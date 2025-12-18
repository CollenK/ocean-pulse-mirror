# Ocean PULSE GitLab CI/CD Configuration Guide
## Complete Deployment Pipeline for Next.js PWA

**Version:** 1.0  
**Date:** December 16, 2024  
**Target Platforms:** Vercel, Cloudflare Pages, Self-Hosted

---

## TABLE OF CONTENTS

1. [GitLab CI/CD Overview](#1-gitlab-cicd-overview)
2. [Complete Pipeline Configuration](#2-complete-pipeline-configuration)
3. [Environment Setup](#3-environment-setup)
4. [Deployment Strategies](#4-deployment-strategies)
5. [Testing & Quality Gates](#5-testing--quality-gates)
6. [Security Scanning](#6-security-scanning)
7. [Performance Monitoring](#7-performance-monitoring)
8. [Rollback Procedures](#8-rollback-procedures)

---

## 1. GITLAB CI/CD OVERVIEW

### 1.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GITLAB CI/CD PIPELINE                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   STAGE 1    │   STAGE 2    │   STAGE 3    │   STAGE 4     │
│   Install    │    Build     │     Test     │    Deploy     │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ • npm ci     │ • Next build │ • Unit tests │ • Staging     │
│ • Cache deps │ • TypeScript │ • E2E tests  │ • Production  │
│              │ • PWA assets │ • Lighthouse │ • Rollback    │
│              │              │ • Security   │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### 1.2 Key Benefits for Ocean PULSE

✅ **Automated Testing** - Lighthouse, security, performance  
✅ **Multiple Environments** - Dev, staging, production  
✅ **Preview Deployments** - Every merge request gets URL  
✅ **Rollback Safety** - One-click revert to previous version  
✅ **Cost Control** - Free tier sufficient for pilot phase  
✅ **GitLab Registry** - Store Docker images privately  

---

## 2. COMPLETE PIPELINE CONFIGURATION

### 2.1 Main GitLab CI Configuration

```yaml
# .gitlab-ci.yml
image: node:18-alpine

stages:
  - install
  - build
  - test
  - security
  - deploy

variables:
  # Node configuration
  NODE_ENV: "production"
  NODE_OPTIONS: "--max-old-space-size=4096"
  
  # Caching
  npm_config_cache: "$CI_PROJECT_DIR/.npm"
  CYPRESS_CACHE_FOLDER: "$CI_PROJECT_DIR/cache/Cypress"
  
  # Deployment
  VERCEL_ORG_ID: $VERCEL_ORG_ID
  VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID
  
  # Feature flags
  NEXT_PUBLIC_PWA_ENABLED: "true"
  NEXT_PUBLIC_API_URL: "https://api.oceanpulse.app"

# Global cache configuration
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
    - .npm/
    - .next/cache/
    - cache/Cypress/

# Install stage
install:dependencies:
  stage: install
  script:
    - npm ci --prefer-offline --no-audit
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour
  only:
    - merge_requests
    - main
    - develop

# Build stage
build:application:
  stage: build
  dependencies:
    - install:dependencies
  before_script:
    - echo "Building Ocean PULSE v${CI_COMMIT_SHORT_SHA}"
  script:
    - npm run build
    - npm run export # For static export if needed
  artifacts:
    paths:
      - .next/
      - out/
      - public/
    expire_in: 1 day
  only:
    - merge_requests
    - main
    - develop

build:pwa-assets:
  stage: build
  dependencies:
    - install:dependencies
  script:
    - npm run generate:icons
    - npm run optimize:images
  artifacts:
    paths:
      - public/icons/
      - public/screenshots/
    expire_in: 1 day
  only:
    - main
    - develop

# Test stage
test:unit:
  stage: test
  dependencies:
    - install:dependencies
  script:
    - npm run test:unit -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
      junit: junit.xml
    paths:
      - coverage/
    expire_in: 30 days
  only:
    - merge_requests
    - main
    - develop

test:e2e:
  stage: test
  image: cypress/browsers:node18.12.0-chrome106-ff106
  dependencies:
    - install:dependencies
    - build:application
  services:
    - name: selenium/standalone-chrome:latest
      alias: chrome
  script:
    - npm run start &
    - npx wait-on http://localhost:3000
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - cypress/videos/
      - cypress/screenshots/
    expire_in: 7 days
  only:
    - merge_requests
    - main

test:lighthouse:
  stage: test
  dependencies:
    - build:application
  before_script:
    - npm install -g @lhci/cli@latest
  script:
    - npm run start &
    - npx wait-on http://localhost:3000
    - lhci autorun --config=lighthouserc.json
  artifacts:
    reports:
      performance: lighthouse-report.json
    paths:
      - .lighthouseci/
    expire_in: 30 days
  only:
    - merge_requests
    - main

test:accessibility:
  stage: test
  dependencies:
    - build:application
  script:
    - npm run start &
    - npx wait-on http://localhost:3000
    - npm run test:a11y
  artifacts:
    reports:
      accessibility: accessibility-report.json
    expire_in: 30 days
  only:
    - merge_requests
    - main

# Security stage
security:dependency-scan:
  stage: security
  script:
    - npm audit --audit-level=high
    - npm run security:check
  allow_failure: true
  only:
    - merge_requests
    - main

security:sast:
  stage: security
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --json --output=semgrep-report.json .
  artifacts:
    reports:
      sast: semgrep-report.json
    expire_in: 30 days
  allow_failure: true
  only:
    - merge_requests
    - main

security:secrets-scan:
  stage: security
  image: zricethezav/gitleaks:latest
  script:
    - gitleaks detect --source . --report-format json --report-path gitleaks-report.json
  artifacts:
    reports:
      secret_detection: gitleaks-report.json
    expire_in: 30 days
  allow_failure: true
  only:
    - merge_requests
    - main

# Deploy stage
deploy:preview:
  stage: deploy
  dependencies:
    - build:application
  environment:
    name: preview/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.oceanpulse.dev
    on_stop: cleanup:preview
    auto_stop_in: 7 days
  script:
    - npm install -g vercel
    - vercel pull --yes --environment=preview --token=$VERCEL_TOKEN
    - vercel build --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --token=$VERCEL_TOKEN > deployment-url.txt
    - echo "Preview deployed to $(cat deployment-url.txt)"
  artifacts:
    paths:
      - deployment-url.txt
    expire_in: 7 days
  only:
    - merge_requests

deploy:staging:
  stage: deploy
  dependencies:
    - build:application
  environment:
    name: staging
    url: https://staging.oceanpulse.app
  script:
    - npm install -g vercel
    - vercel pull --yes --environment=preview --token=$VERCEL_TOKEN
    - vercel build --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
  only:
    - develop

deploy:production:
  stage: deploy
  dependencies:
    - build:application
  environment:
    name: production
    url: https://oceanpulse.app
  before_script:
    - echo "🚀 Deploying Ocean PULSE to production"
    - echo "Version: ${CI_COMMIT_TAG:-${CI_COMMIT_SHORT_SHA}}"
  script:
    - npm install -g vercel
    - vercel pull --yes --environment=production --token=$VERCEL_TOKEN
    - vercel build --prod --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
  after_script:
    - echo "✅ Production deployment complete"
    - echo "URL: https://oceanpulse.app"
  only:
    - main
    - tags
  when: manual

# Cleanup job
cleanup:preview:
  stage: deploy
  environment:
    name: preview/$CI_COMMIT_REF_SLUG
    action: stop
  script:
    - npm install -g vercel
    - vercel remove --yes --token=$VERCEL_TOKEN $CI_ENVIRONMENT_URL
  when: manual
  only:
    - merge_requests

# Rollback job
rollback:production:
  stage: deploy
  environment:
    name: production
    url: https://oceanpulse.app
  script:
    - npm install -g vercel
    - vercel rollback --token=$VERCEL_TOKEN --yes
    - echo "⚠️ Rolled back to previous deployment"
  only:
    - main
  when: manual
```

---

## 3. ENVIRONMENT SETUP

### 3.1 GitLab CI/CD Variables

Navigate to: **Settings > CI/CD > Variables**

```bash
# Required Variables
VERCEL_TOKEN                 # Vercel authentication token
VERCEL_ORG_ID               # Your Vercel organization ID
VERCEL_PROJECT_ID           # Your Vercel project ID

# API Keys (Protected & Masked)
OBIS_API_KEY                # OBIS API key (if needed)
COPERNICUS_API_KEY          # Copernicus Marine API key
GFW_API_TOKEN               # Global Fishing Watch token

# Database (if using)
DATABASE_URL                # PostgreSQL connection string
REDIS_URL                   # Redis cache URL

# Monitoring
SENTRY_DSN                  # Sentry error tracking
SENTRY_AUTH_TOKEN           # Sentry release deployment

# Feature Flags
NEXT_PUBLIC_PWA_ENABLED     # Enable PWA features
NEXT_PUBLIC_ANALYTICS_ID    # Analytics tracking ID
NEXT_PUBLIC_API_URL         # Backend API URL

# Security
JWT_SECRET                  # JWT signing secret
ENCRYPTION_KEY              # Data encryption key
```

### 3.2 Setting Variables via GitLab UI

1. Go to **Settings > CI/CD**
2. Expand **Variables**
3. Click **Add Variable**
4. Configure:
   - **Type:** Variable
   - **Environment scope:** All / Specific
   - **Flags:** Protected, Masked (for secrets)
   - **Key:** Variable name
   - **Value:** Secret value

### 3.3 Getting Vercel Credentials

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Get credentials
vercel env pull .env.local

# Extract tokens from .vercel/project.json
cat .vercel/project.json
```

---

## 4. DEPLOYMENT STRATEGIES

### 4.1 Vercel Deployment (Recommended)

```yaml
# .gitlab-ci.yml - Vercel specific
deploy:vercel:
  stage: deploy
  image: node:18-alpine
  script:
    - npm install -g vercel@latest
    - |
      if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        vercel --prod --token=$VERCEL_TOKEN
      else
        vercel --token=$VERCEL_TOKEN
      fi
  environment:
    name: $CI_COMMIT_REF_SLUG
    url: $VERCEL_URL
```

**Benefits:**
- Automatic HTTPS
- Global CDN
- Serverless functions
- Zero config deployment
- Preview URLs for MRs

### 4.2 Cloudflare Pages Deployment

```yaml
# .gitlab-ci.yml - Cloudflare Pages
deploy:cloudflare:
  stage: deploy
  image: node:18-alpine
  before_script:
    - npm install -g wrangler
  script:
    - wrangler pages publish out/ --project-name=oceanpulse
  environment:
    name: production
    url: https://oceanpulse.pages.dev
  only:
    - main
```

**Setup Cloudflare:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Create project
wrangler pages project create oceanpulse

# Get API token from Cloudflare dashboard
# Add to GitLab: CLOUDFLARE_API_TOKEN
```

### 4.3 Self-Hosted Deployment (Docker)

```yaml
# .gitlab-ci.yml - Docker deployment
docker:build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

deploy:docker:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh $DEPLOY_USER@$DEPLOY_HOST "docker pull $CI_REGISTRY_IMAGE:latest"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "docker stop oceanpulse || true"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "docker rm oceanpulse || true"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "docker run -d --name oceanpulse -p 80:3000 $CI_REGISTRY_IMAGE:latest"
  environment:
    name: production
    url: https://oceanpulse.app
  only:
    - main
  when: manual
```

**Dockerfile:**
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 5. TESTING & QUALITY GATES

### 5.1 Lighthouse Configuration

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "emulatedFormFactor": "mobile",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "categories:pwa": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 5.2 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/public/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: ['/node_modules/', '^.+\\.module\\.(css|sass|scss)$'],
  reporters: ['default', 'jest-junit']
}
```

### 5.3 Cypress E2E Tests

```javascript
// cypress/e2e/ocean-pulse.cy.ts
describe('Ocean PULSE E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  
  it('should load the dashboard', () => {
    cy.get('h1').should('contain', 'Ocean PULSE')
    cy.get('[data-testid="kpi-cards"]').should('be.visible')
  })
  
  it('should select an MPA', () => {
    cy.get('[data-testid="mpa-filter"]').select('great-barrier')
    cy.get('[data-testid="mpa-name"]').should('contain', 'Great Barrier Reef')
  })
  
  it('should load species data', () => {
    cy.get('[data-testid="mpa-marker"]').first().click()
    cy.get('[data-testid="species-count"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.contain', '---')
  })
  
  it('should work offline', () => {
    cy.visit('/')
    cy.wait(2000)
    
    // Go offline
    cy.window().then(win => {
      win.dispatchEvent(new Event('offline'))
    })
    
    cy.get('[data-testid="offline-indicator"]').should('be.visible')
    cy.get('[data-testid="map"]').should('be.visible')
  })
  
  it('should be installable as PWA', () => {
    cy.window().then(win => {
      expect(win.navigator.serviceWorker).to.exist
    })
  })
})
```

---

## 6. SECURITY SCANNING

### 6.1 Dependency Scanning

```yaml
# .gitlab-ci.yml - Enhanced security
security:npm-audit:
  stage: security
  script:
    - npm audit --json > npm-audit.json
    - npm audit --audit-level=high
  artifacts:
    reports:
      dependency_scanning: npm-audit.json
    expire_in: 30 days
  allow_failure: true

security:snyk:
  stage: security
  image: snyk/snyk:node
  script:
    - snyk auth $SNYK_TOKEN
    - snyk test --json > snyk-report.json
    - snyk monitor
  artifacts:
    reports:
      dependency_scanning: snyk-report.json
  allow_failure: true
  only:
    - main
```

### 6.2 Secret Scanning

```yaml
security:trufflehog:
  stage: security
  image: trufflesecurity/trufflehog:latest
  script:
    - trufflehog filesystem . --json > secrets-report.json
  artifacts:
    reports:
      secret_detection: secrets-report.json
  allow_failure: true
```

### 6.3 Container Scanning (if using Docker)

```yaml
security:container-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy image --format json --output trivy-report.json $CI_REGISTRY_IMAGE:latest
  artifacts:
    reports:
      container_scanning: trivy-report.json
  dependencies:
    - docker:build
  only:
    - main
```

---

## 7. PERFORMANCE MONITORING

### 7.1 Bundle Size Tracking

```yaml
# .gitlab-ci.yml - Bundle analysis
test:bundle-size:
  stage: test
  dependencies:
    - build:application
  script:
    - npm run analyze
    - |
      if [ -f .next/analyze/__bundle_analysis.json ]; then
        cat .next/analyze/__bundle_analysis.json
      fi
  artifacts:
    paths:
      - .next/analyze/
    expire_in: 30 days
```

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:browser": "npx serve .next/analyze"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^14.0.0"
  }
}
```

### 7.2 Performance Budget

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxAssetSize: 244000, // 244 KB
        maxEntrypointSize: 244000,
        hints: 'error'
      }
    }
    return config
  }
}
```

---

## 8. ROLLBACK PROCEDURES

### 8.1 Automated Rollback on Failure

```yaml
# .gitlab-ci.yml - Auto rollback
deploy:production:
  stage: deploy
  script:
    - npm install -g vercel
    - vercel deploy --prod --token=$VERCEL_TOKEN || rollback
  after_script:
    - |
      if [ $CI_JOB_STATUS == 'failed' ]; then
        echo "Deployment failed, rolling back..."
        vercel rollback --token=$VERCEL_TOKEN --yes
      fi
  only:
    - main
```

### 8.2 Manual Rollback Job

```yaml
rollback:manual:
  stage: deploy
  environment:
    name: production
    action: rollback
  script:
    - npm install -g vercel
    - vercel rollback --token=$VERCEL_TOKEN --yes
    - echo "✅ Rolled back to previous deployment"
  only:
    - main
  when: manual
```

### 8.3 Rollback to Specific Version

```yaml
rollback:to-version:
  stage: deploy
  script:
    - |
      if [ -z "$ROLLBACK_VERSION" ]; then
        echo "Error: ROLLBACK_VERSION variable not set"
        exit 1
      fi
    - npm install -g vercel
    - vercel rollback $ROLLBACK_VERSION --token=$VERCEL_TOKEN --yes
  only:
    - main
  when: manual
```

---

## 9. NOTIFICATION SETUP

### 9.1 Slack Notifications

```yaml
# .gitlab-ci.yml - Slack integration
.notify_slack: &notify_slack
  after_script:
    - |
      curl -X POST -H 'Content-type: application/json' \
      --data "{
        'text': '🚀 Ocean PULSE Deployment',
        'attachments': [{
          'color': '$SLACK_COLOR',
          'fields': [
            {'title': 'Project', 'value': '$CI_PROJECT_NAME', 'short': true},
            {'title': 'Branch', 'value': '$CI_COMMIT_BRANCH', 'short': true},
            {'title': 'Commit', 'value': '$CI_COMMIT_SHORT_SHA', 'short': true},
            {'title': 'Status', 'value': '$CI_JOB_STATUS', 'short': true},
            {'title': 'Pipeline', 'value': '$CI_PIPELINE_URL', 'short': false}
          ]
        }]
      }" $SLACK_WEBHOOK_URL

deploy:production:
  <<: *notify_slack
  variables:
    SLACK_COLOR: 'good'
  # ... rest of job config
```

### 9.2 Email Notifications

Configure in GitLab: **Settings > Integrations > Emails on push**

---

## 10. BEST PRACTICES CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Lighthouse score >90
- [ ] Security scans clean
- [ ] Bundle size within budget
- [ ] Environment variables configured
- [ ] Database migrations run (if applicable)

### During Deployment
- [ ] Monitor deployment logs
- [ ] Check application health
- [ ] Verify service worker registration
- [ ] Test critical user flows
- [ ] Monitor error rates

### Post-Deployment
- [ ] Smoke test production
- [ ] Check analytics
- [ ] Review performance metrics
- [ ] Monitor error tracking (Sentry)
- [ ] Update deployment documentation

---

## 11. COST ANALYSIS

### GitLab CI/CD Runner Costs

```
TIER              MINUTES/MONTH    COST/MONTH    OCEAN PULSE USAGE
─────────────────────────────────────────────────────────────────
GitLab Free       400 minutes      €0            Sufficient for pilot
GitLab Premium    10,000 minutes   €19/user      Overkill
Self-Hosted       Unlimited        Server cost   Complex for pilot

RECOMMENDATION: Start with Free tier (400 min/month)
- ~10 pipelines per day = 300 min/month
- Leaves 100 min buffer
```

### Total CI/CD Costs

```
SERVICE              COST/MONTH    NOTES
─────────────────────────────────────────────────────
GitLab Free          €0            400 CI minutes
Vercel Hobby         €0            100GB bandwidth
Vercel Pro           €20           If scaling needed
Monitoring (Sentry)  €0            Free tier
Total Pilot Cost     €0-20/month   
```

---

## 12. TROUBLESHOOTING

### Common Issues

**Pipeline fails at build:**
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
gitlab-ci-clean-cache

# Increase memory
NODE_OPTIONS="--max-old-space-size=4096"
```

**Vercel deployment fails:**
```bash
# Check token expiry
vercel whoami --token=$VERCEL_TOKEN

# Re-link project
vercel link --yes --token=$VERCEL_TOKEN

# Check org/project IDs match
```

**Lighthouse fails:**
```bash
# Increase timeout
wait-on http://localhost:3000 --timeout 60000

# Check if server started
curl http://localhost:3000

# Run locally
npm run start
lhci autorun
```

---

## 13. QUICK START GUIDE

### Step 1: Initial Setup (5 minutes)

```bash
# 1. Clone repository
git clone https://gitlab.com/oceanpulse/dashboard.git
cd dashboard

# 2. Install dependencies
npm install

# 3. Create .gitlab-ci.yml
cp .gitlab-ci.yml.example .gitlab-ci.yml

# 4. Test locally
npm run build
npm run start
```

### Step 2: Configure GitLab (10 minutes)

1. Go to **Settings > CI/CD > Variables**
2. Add required variables:
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - VERCEL_PROJECT_ID
3. Save and trigger pipeline

### Step 3: First Deployment (5 minutes)

```bash
# Push to trigger pipeline
git add .
git commit -m "feat: initial Ocean PULSE deployment"
git push origin main

# Monitor pipeline
# GitLab > CI/CD > Pipelines
```

### Step 4: Verify Deployment (5 minutes)

1. Check pipeline status
2. Visit preview URL
3. Test PWA installation
4. Verify offline mode
5. Check Lighthouse scores

**Total setup time: ~25 minutes** 🚀

---

## APPENDIX A: Complete File Structure

```
ocean-pulse/
├── .gitlab-ci.yml              # Main CI/CD config
├── .gitlab/
│   └── merge_request_templates/
│       └── default.md          # MR template
├── lighthouserc.json           # Lighthouse config
├── jest.config.js              # Jest testing
├── cypress.config.ts           # E2E testing
├── next.config.js              # Next.js config
├── Dockerfile                  # Docker config
├── docker-compose.yml          # Local Docker setup
└── scripts/
    ├── deploy.sh               # Deployment script
    ├── rollback.sh             # Rollback script
    └── health-check.sh         # Health check script
```

---

## APPENDIX B: Merge Request Template

```markdown
# .gitlab/merge_request_templates/default.md

## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Checklist
- [ ] Tests pass locally
- [ ] Lighthouse score >90
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Security scan clean
- [ ] Documentation updated

## Screenshots
(if applicable)

## Deployment Notes
Any special deployment considerations

## Related Issues
Closes #
```

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2024  
**Maintained By:** Ocean PULSE DevOps Team  
**Next Review:** After pilot deployment
