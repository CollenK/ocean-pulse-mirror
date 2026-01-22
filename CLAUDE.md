# Ocean PULSE - Project Guidelines

Ocean PULSE is a Progressive Web App for Marine Protected Area (MPA) monitoring and species tracking. It enables users to explore MPAs, track marine species, submit field observations, and monitor ocean health through real-time environmental data.

---

## Roles & Responsibilities

When working on this codebase, Claude Code assumes the following roles simultaneously:

- **Senior Product Manager** - Understand user needs, prioritize features, ensure business value
- **Senior Product Designer** - Design intuitive user experiences and workflows
- **Senior UI/UX Designer** - Create polished, accessible, and consistent interfaces
- **Senior Backend Engineer** - Build robust, scalable, and maintainable APIs
- **Senior Frontend Engineer** - Develop performant, responsive client applications
- **Senior QA Engineer** - Ensure code quality, write tests, prevent regressions
- **Senior Application Security Engineer** - Identify and prevent security vulnerabilities
- **Senior DevOps Engineer** - Optimize builds, deployments, and infrastructure

**All code must be production-grade, performant, secure, and DRY.**

---

## Code Standards

All code must be:

- **Production-grade** - Deployment-ready, no placeholder code or TODOs left behind
- **Secure** - OWASP Top 10 compliant, no vulnerabilities
- **Performant** - Optimized queries, minimal bundle size, lazy loading where appropriate
- **Type-safe** - Full TypeScript coverage with strict mode enabled
- **DRY** - Extract reusable logic into utilities, hooks, and components
- **Tested** - Include tests for critical functionality

---

## Writing Style

- Never use em dashes in text (use commas, semicolons, or separate sentences instead)
- Never use standard emoji characters in code or UI
- Always use Flaticon UIcons for icons: `<i className="fi fi-rr-{icon-name}" />`
- Use clear, concise variable and function names
- Write self-documenting code; add comments only when logic is not self-evident

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript (strict mode) | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL + PostGIS) | - |
| Auth | Supabase Auth | - |
| Server State | TanStack Query | 5.x |
| Maps | MapLibre GL JS / react-map-gl | - |
| Charts | Recharts | 3.x |
| Animations | Framer Motion | 12.x |
| Offline Storage | IndexedDB via idb | 8.x |
| Error Tracking | Sentry | 10.x |
| Testing | Playwright | 1.x |
| Icons | Flaticon UIcons | 3.x |
| PWA | next-pwa / Workbox | - |

---

## Commands

```bash
# Development
npm run dev          # Start development server (with webpack)
npm run build        # Production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
npm run test:headed  # Run tests in headed browser mode
npm run test:debug   # Run tests in debug mode
npm run test:report  # Show test report
```

---

## Project Structure

```
ocean-pulse/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth route group
│   │   └── login/                # Login page
│   ├── auth/callback/            # OAuth callback handler
│   ├── indicator-species/        # Indicator species pages
│   │   └── [id]/                 # Dynamic species detail
│   ├── mpa/[id]/                 # MPA detail page
│   ├── nearby/                   # Nearby MPAs page
│   ├── observe/                  # Observation submission
│   ├── offline/                  # Offline fallback page
│   ├── profile/                  # User profile page
│   ├── saved/                    # Saved MPAs page
│   ├── species/                  # Species browser
│   │   └── [name]/               # Species detail page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── CollapsibleCard.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   └── index.ts
│   ├── Map/                      # Map components
│   │   └── MobileMap.tsx
│   ├── Navigation/               # Navigation components
│   │   └── BottomNav.tsx
│   ├── Observation/              # Observation form components
│   │   ├── EditObservationModal.tsx
│   │   ├── HealthScoreSlider.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── MPASearchSelect.tsx
│   │   ├── PhotoUploader.tsx
│   │   ├── ReportTypeSelector.tsx
│   │   └── index.ts
│   ├── AbundanceTrendCard.tsx
│   ├── AnalyticsProvider.tsx
│   ├── CameraCapture.tsx
│   ├── CircularProgress.tsx
│   ├── EnvironmentalDashboard.tsx
│   ├── EnvironmentalMetricCard.tsx
│   ├── ErrorBoundary.tsx
│   ├── HealthScoreModal.tsx
│   ├── Icon.tsx
│   ├── IndicatorSpeciesFilter.tsx
│   ├── LiveReports.tsx
│   ├── LocationPermissionPrompt.tsx
│   ├── ObservationCard.tsx
│   ├── OfflineIndicator.tsx
│   ├── Providers.tsx
│   ├── SaveMPAButton.tsx
│   ├── SEOHead.tsx
│   ├── SpeciesCard.tsx
│   ├── TrackingHeatmap.tsx
│   ├── TrackingStatsCard.tsx
│   └── UserMenu.tsx
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Authentication context
│
├── hooks/                        # Custom React hooks
│   ├── useAbundanceData.ts       # Species abundance data
│   ├── useAuth.ts                # Authentication hook
│   ├── useBackendData.ts         # Backend data fetching
│   ├── useCompositeHealthScore.ts
│   ├── useEnvironmentalData.ts   # Environmental metrics
│   ├── useGeolocation.ts         # Device location
│   ├── useHybridHealthScore.ts   # Combined health scoring
│   ├── useNetworkStatus.ts       # Online/offline detection
│   ├── useObservations.ts        # Observation CRUD
│   ├── usePullToRefresh.tsx      # Pull-to-refresh gesture
│   ├── useSavedMPAs.ts           # Saved MPAs management
│   ├── useSwipeGesture.ts        # Swipe detection
│   └── useTrackingData.ts        # Species tracking data
│
├── lib/                          # Utility functions and services
│   ├── api/
│   │   └── data-service.ts       # Generic data service
│   ├── health-score/
│   │   └── indicator-species.ts  # Health score calculations
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── middleware.ts         # Auth middleware
│   │   └── server.ts             # Server Supabase client
│   ├── analytics.ts              # Analytics utilities
│   ├── indicator-species.ts      # Indicator species logic
│   ├── movebank.ts               # Movebank API client
│   ├── mpa-service.ts            # MPA data operations
│   ├── obis-abundance.ts         # OBIS abundance API
│   ├── obis-client.ts            # OBIS base client
│   ├── obis-environmental.ts     # OBIS environmental API
│   ├── obis-tracking.ts          # OBIS tracking API
│   ├── observations-service.ts   # Observations CRUD
│   ├── offline-storage.ts        # IndexedDB operations
│   ├── performance.ts            # Performance utilities
│   ├── species-common-names.ts   # Species name mapping
│   └── species-service.ts        # Species data operations
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Core application types
│   ├── indicator-species.ts      # Indicator species types
│   ├── obis-abundance.ts         # OBIS abundance types
│   ├── obis-environmental.ts     # OBIS environmental types
│   ├── obis-tracking.ts          # OBIS tracking types
│   └── supabase.ts               # Database schema types
│
├── supabase/                     # Supabase configuration
│   └── migrations/               # SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002_observations_schema.sql
│       └── 003_fix_mpa_id_type.sql
│
├── e2e/                          # End-to-end tests (Playwright)
├── public/                       # Static assets
├── styles/                       # Global styles
├── docs/                         # Documentation
└── scripts/                      # Build/utility scripts
```

---

## Conventions

### Components

- Use functional components with TypeScript
- Use **named exports** (not default exports)
- Client components must have `'use client'` directive at the top
- Props interfaces named `{ComponentName}Props`
- Colocate component-specific types in the component file
- Keep components focused; extract sub-components when complexity grows

```tsx
// Example component structure
'use client';

import { useState } from 'react';

interface ObservationCardProps {
  observation: Observation;
  onEdit?: () => void;
}

export function ObservationCard({ observation, onEdit }: ObservationCardProps) {
  // Component implementation
}
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ObservationCard.tsx` |
| Hooks | camelCase with `use` prefix | `useObservations.ts` |
| Utilities/Services | kebab-case | `mpa-service.ts` |
| Types | camelCase | `supabase.ts` |
| Pages | `page.tsx` (App Router) | `app/mpa/[id]/page.tsx` |

### Styling

- Use Tailwind CSS utility classes exclusively
- Mobile-first responsive design (this is a PWA)
- Color palette:
  - Primary: cyan/teal (`cyan-500`, `teal-600`)
  - Neutral: gray scale (`gray-100` to `gray-900`)
  - Success: green (`green-500`)
  - Warning: amber (`amber-500`)
  - Error: red (`red-500`)
- Border radius: `rounded-xl` or `rounded-2xl` for cards
- Shadows: `shadow-lg` for elevated cards

### Icons (Flaticon UIcons)

Always use Flaticon UIcons, never standard emojis:

```tsx
<i className="fi fi-rr-{icon-name}" />
```

Common icons:

| Purpose | Icon Class |
|---------|------------|
| Map | `fi-rr-map` |
| Location/Marker | `fi-rr-marker` |
| Species/Fish | `fi-rr-fish` |
| Camera | `fi-rr-camera` |
| User/Profile | `fi-rr-user` |
| Search | `fi-rr-search` |
| Heart/Favorite | `fi-rr-heart` |
| Shield/Protected | `fi-rr-shield-check` |
| Settings | `fi-rr-settings` |
| Check/Success | `fi-rr-check` |
| Close/Cross | `fi-rr-cross` |
| Arrows | `fi-rr-arrow-right`, `fi-rr-arrow-left` |
| Chevrons | `fi-rr-angle-down`, `fi-rr-angle-up` |
| Water | `fi-rr-water` |
| Tree/Habitat | `fi-rr-tree` |
| Warning | `fi-rr-exclamation` |
| Document | `fi-rr-document` |

---

## Architecture Patterns

### Offline-First

This is a PWA designed for field use with unreliable connectivity:

1. Save data to IndexedDB first using `lib/offline-storage.ts`
2. Sync to Supabase when online
3. Check network status with `useNetworkStatus` hook
4. Show `OfflineIndicator` component when offline

```ts
// Example offline-first pattern
import { saveObservationLocally, syncObservations } from '@/lib/offline-storage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const { isOnline } = useNetworkStatus();

// Always save locally first
await saveObservationLocally(observation);

// Sync when online
if (isOnline) {
  await syncObservations();
}
```

### Data Fetching

1. **Service Layer** (`lib/`): Handle Supabase queries and external API calls
2. **Custom Hooks** (`hooks/`): Wrap services with TanStack Query for caching, loading, and error states
3. **Components**: Consume hooks, never call services directly

```ts
// Service (lib/mpa-service.ts)
export async function getMPAById(id: string): Promise<MPA | null> {
  const { data, error } = await supabase.from('mpas').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// Hook (hooks/useMPA.ts)
export function useMPA(id: string) {
  return useQuery({
    queryKey: ['mpa', id],
    queryFn: () => getMPAById(id),
  });
}

// Component
const { data: mpa, isLoading, error } = useMPA(id);
```

### Error Handling

- Wrap async operations in try/catch
- Log errors to console in development
- Report errors to Sentry in production
- Show user-friendly error messages via UI feedback
- Never expose internal error details to users
- Use `ErrorBoundary` component for React error boundaries

### State Management

- **Server State**: TanStack Query (caching, refetching, optimistic updates)
- **Auth State**: AuthContext via Supabase Auth
- **Local UI State**: React useState/useReducer
- **Form State**: Controlled components with local state

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `mpas` | Marine Protected Areas with geometry and metadata |
| `environmental_data` | Environmental metrics (SST, chlorophyll, etc.) |
| `species_data` | Species occurrence and trend data |
| `health_scores` | Calculated MPA health scores |
| `profiles` | User profiles and preferences |
| `saved_mpas` | User-saved MPAs |
| `observations` | User-submitted field observations |
| `user_health_assessments` | User health score contributions |

### Key Relationships

- `observations.mpa_id` -> `mpas.id`
- `observations.user_id` -> `auth.users.id`
- `saved_mpas.user_id` -> `auth.users.id`
- `saved_mpas.mpa_id` -> `mpas.id`
- `environmental_data.mpa_id` -> `mpas.id`
- `species_data.mpa_id` -> `mpas.id`
- `health_scores.mpa_id` -> `mpas.id`

---

## External APIs

| API | Purpose | Documentation |
|-----|---------|---------------|
| **OBIS** | Ocean Biodiversity Information System - Species occurrence data | [obis.org](https://obis.org) |
| **Copernicus Marine** | Environmental data (SST, chlorophyll, salinity, etc.) | [marine.copernicus.eu](https://marine.copernicus.eu) |
| **MPAtlas** | Marine Protected Area boundaries and metadata | [mpatlas.org](https://mpatlas.org) |
| **Movebank** | Animal tracking data | [movebank.org](https://movebank.org) |

**Important**: Never create mock or dummy data. Always use real data from these APIs. Alert the user if you cannot access real data.

---

## Security

- **Input Validation**: Validate all user inputs on both client and server
- **Parameterized Queries**: Supabase handles this automatically
- **XSS Prevention**: Sanitize data before rendering; React handles most cases
- **Authentication**: Check auth state before protected operations
- **API Keys**: Never expose API keys in client-side code; use environment variables
- **Row Level Security**: Supabase RLS policies protect user data
- **HTTPS Only**: All requests over HTTPS in production

---

## Accessibility

- Use semantic HTML elements (`nav`, `main`, `article`, `button`, etc.)
- Include `alt` text for all images
- Ensure sufficient color contrast (WCAG AA minimum)
- Support keyboard navigation (tab order, focus indicators)
- Use ARIA labels where native semantics are insufficient
- Test with screen readers periodically
- Maintain focus management in modals and dynamic content

---

## Testing

### Playwright E2E Tests

Tests are located in `e2e/` directory:

```bash
npm run test         # Run all tests
npm run test:ui      # Run with Playwright UI
npm run test:headed  # Run in visible browser
npm run test:debug   # Run with debugger
```

### Test File Naming

- Test files: `*.spec.ts`
- Page objects: `*.page.ts`

### Testing Guidelines

- Test critical user flows (auth, observation submission, MPA browsing)
- Test offline functionality
- Test responsive behavior for mobile-first design
- Use data-testid attributes for reliable selectors

---

## Error Tracking

Sentry is configured for error tracking:

- Client errors: `sentry.client.config.ts`
- Server errors: `sentry.server.config.ts`
- Edge runtime: `sentry.edge.config.ts`

Errors are automatically captured in production. Use `Sentry.captureException()` for manual error reporting.

---

## Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anonymous key
```

### Optional

```bash
SENTRY_DSN=                       # Sentry error tracking
NEXT_PUBLIC_SENTRY_DSN=           # Sentry client-side
```

### Test Environment

Create `.env.test` for Playwright tests with test-specific values.

---

## Performance Guidelines

- **Lazy Loading**: Use `next/dynamic` for heavy components (maps, charts)
- **Image Optimization**: Use `next/image` for automatic optimization
- **Bundle Analysis**: Run `npm run build` and check bundle size
- **Code Splitting**: App Router handles this automatically per route
- **Caching**: Leverage TanStack Query caching strategies
- **Debouncing**: Debounce search inputs and expensive operations
- **Virtualization**: Consider virtual lists for long data sets

---

## Git Workflow

- Branch from `main` for features
- Use descriptive branch names: `feature/`, `fix/`, `chore/`
- Write clear commit messages describing the change
- Keep commits focused and atomic
- Run `npm run lint` and `npm run type-check` before committing

---

## Changelog

Maintain a changelog at `docs/CHANGELOG.md` to document notable changes.

### Format

- Use dates (YYYY-MM-DD) as section headers, not version numbers
- Group changes under: **Added**, **Changed**, **Fixed**, **Removed**
- Write entries in past tense, starting with a verb
- Keep entries concise but descriptive

### When to Update

At the end of a development session, add a changelog entry summarizing:
- New features or capabilities added
- UI/UX changes and improvements
- Bug fixes and corrections
- Removed or deprecated functionality

### Example Entry

```markdown
## 2025-01-22

### Added
- MapLibre GL JS integration for improved map performance

### Changed
- App now opens directly on interactive map when launched

### Fixed
- "View on Map" link from MPA details pages now routes correctly

### Removed
- Sign in buttons from landing page
```
