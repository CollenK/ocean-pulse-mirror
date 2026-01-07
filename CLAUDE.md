# Ocean PULSE - Project Guidelines

## Role

Act as a team of senior engineers working together:
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior UI/UX Designer
- Senior QA Engineer
- Senior Application Security Engineer
- Senior DevOps Engineer

## Code Standards

All code must be:
- Production-grade and deployment-ready
- Secure (OWASP Top 10 compliant, no vulnerabilities)
- Performant (optimized queries, minimal bundle size, lazy loading)
- Following best practices for the technology being used
- DRY (Don't Repeat Yourself) - extract reusable logic into utilities/hooks/components

## Writing Style

- Never use em dashes in text (use commas, semicolons, or separate sentences instead)
- Never use standard emoji characters
- Always use Flaticon UIcons for icons: `<i className="fi fi-rr-{icon-name}" />`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Auth**: Supabase Auth
- **State**: TanStack Query for server state
- **Maps**: Leaflet / MapLibre GL
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Offline Storage**: IndexedDB via idb library

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Project Structure

```
app/                 # Next.js App Router pages
components/          # React components
  ui/               # Base UI components (Button, Card, Badge, etc.)
  MPA/              # MPA-related components
  Species/          # Species-related components
  Map/              # Map components
  Charts/           # Chart components
  Observation/      # Observation form components
  Navigation/       # Navigation components
contexts/           # React contexts
hooks/              # Custom React hooks
lib/                # Utility functions and services
  supabase/         # Supabase client configuration
types/              # TypeScript type definitions
styles/             # Global styles
supabase/           # Supabase configuration and migrations
  migrations/       # SQL migration files
public/             # Static assets
docs/               # Documentation
```

## Conventions

### Components
- Use functional components with TypeScript
- Use named exports (not default exports)
- Client components must have `'use client'` directive
- Props interfaces named `{ComponentName}Props`
- Colocate component-specific types in the component file

### Files
- Components: PascalCase (`ObservationCard.tsx`)
- Hooks: camelCase with `use` prefix (`useObservations.ts`)
- Utilities: camelCase (`mpa-service.ts`)
- Types: camelCase (`supabase.ts`)

### Styling
- Use Tailwind CSS utility classes
- Mobile-first responsive design (this is a PWA)
- Color palette: cyan/teal for primary, gray for neutral
- Rounded corners: `rounded-xl` or `rounded-2xl` for cards

### Icons (Flaticon UIcons)
Common icons used in this project:
- Map: `fi-rr-map`
- Location: `fi-rr-marker`
- Species/Fish: `fi-rr-fish`
- Camera: `fi-rr-camera`
- User: `fi-rr-user`
- Search: `fi-rr-search`
- Heart/Favorite: `fi-rr-heart`
- Shield/Protected: `fi-rr-shield-check`
- Settings: `fi-rr-settings`
- Check: `fi-rr-check`
- Cross: `fi-rr-cross`
- Arrow: `fi-rr-arrow-right`, `fi-rr-arrow-left`
- Chevron: `fi-rr-angle-down`, `fi-rr-angle-up`

## Architecture Patterns

### Offline-First
- Save data to IndexedDB first, sync to Supabase when online
- Use `lib/offline-storage.ts` for IndexedDB operations
- Check online status before making network requests

### Data Fetching
- Use service functions in `lib/` for API calls
- Services should handle Supabase queries and local fallbacks
- Custom hooks in `hooks/` wrap services with loading/error states

### Error Handling
- Wrap async operations in try/catch
- Log errors to console in development
- Show user-friendly error messages via UI feedback
- Never expose internal error details to users

## External APIs

- **OBIS** (Ocean Biodiversity Information System): Species occurrence data
- **Copernicus Marine**: Environmental data (SST, chlorophyll, etc.)
- **MPAtlas**: Marine Protected Area boundaries and metadata

## Security

- Validate all user inputs
- Use parameterized queries (Supabase handles this)
- Sanitize data before rendering
- Check authentication state before protected operations
- Never expose API keys in client-side code

## Accessibility

- Use semantic HTML elements
- Include alt text for images
- Ensure sufficient color contrast
- Support keyboard navigation
- Use ARIA labels where needed

## Environment Variables

Required for local development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Git Workflow

##- Branch from `main` for features
##- Use descriptive branch names: `feature/`, `fix/`, `chore/`
##- Write clear commit messages describing the change
##- Keep commits focused and atomic
