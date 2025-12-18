# Ocean PULSE PWA - Detailed Implementation Plan
**Version:** 1.0
**Created:** December 18, 2024
**Project Duration:** 8-10 weeks
**Target Platform:** Progressive Web App (iOS, Android, Desktop)

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Development Phases](#development-phases)
4. [Phase 1: Project Setup & PWA Foundation](#phase-1-project-setup--pwa-foundation)
5. [Phase 2: Core UI & Navigation](#phase-2-core-ui--navigation)
6. [Phase 3: Map Integration & MPA Display](#phase-3-map-integration--mpa-display)
7. [Phase 4: Offline Functionality](#phase-4-offline-functionality)
8. [Phase 5: Mobile Features](#phase-5-mobile-features)
9. [Phase 6: Data Integration](#phase-6-data-integration)
10. [Phase 7: Testing & Optimization](#phase-7-testing--optimization)
11. [Phase 8: Deployment & Launch](#phase-8-deployment--launch)
12. [UI Component Specifications](#ui-component-specifications)
13. [Testing Strategy](#testing-strategy)
14. [Risk Management](#risk-management)

---

## PROJECT OVERVIEW

### Vision
Ocean PULSE is a mobile-first Progressive Web App that enables researchers, tourists, and marine enthusiasts to monitor Marine Protected Areas (MPAs), track species, and contribute observations—even in offline, remote locations.

### Key Success Metrics
- **Performance:** Lighthouse PWA score >90
- **Load Time:** First Contentful Paint <1.8s on 3G
- **Offline:** Full functionality for cached MPAs
- **Mobile UX:** Touch targets ≥44px, thumb-friendly navigation
- **Installation:** >30% install rate within first month

### Technology Stack
```
Frontend:     Next.js 14 + TypeScript + Tailwind CSS
PWA:          next-pwa + Workbox
Maps:         Leaflet / React-Leaflet
Storage:      IndexedDB (idb library)
API:          OBIS (Ocean Biodiversity Information System)
Deployment:   Vercel / Cloudflare Pages
CI/CD:        GitLab CI with Lighthouse testing
Design:       frontend-design skill for all UI components
```

---

## TECHNICAL ARCHITECTURE

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (PWA)                              │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Next.js + React)                                 │
│  ├── Mobile-First Components (frontend-design)              │
│  ├── Map Interface (Leaflet)                                │
│  └── Camera/Geolocation APIs                                │
├─────────────────────────────────────────────────────────────┤
│  Service Worker Layer                                        │
│  ├── Cache Strategy (Workbox)                               │
│  ├── Background Sync                                         │
│  └── Push Notifications                                      │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  ├── IndexedDB (Offline Storage)                            │
│  ├── API Client (OBIS)                                      │
│  └── State Management                                        │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                             │
├─────────────────────────────────────────────────────────────┤
│  OBIS API          → Species data                           │
│  OpenStreetMap     → Map tiles (cached)                     │
│  ESRI              → MPA boundaries                          │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure
```
ocean-pulse/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout with PWA setup
│   ├── page.tsx                 # Home/Map view
│   ├── nearby/                  # Nearby MPAs page
│   ├── observe/                 # Observation capture page
│   ├── mpa/[id]/               # MPA detail page
│   └── profile/                # User profile page
├── components/
│   ├── ui/                     # UI primitives (frontend-design)
│   ├── Map/                    # Map components
│   ├── Navigation/             # BottomNav, etc.
│   ├── Observation/            # Camera, forms
│   └── MPA/                    # MPA cards, details
├── lib/
│   ├── offline-storage.ts      # IndexedDB utilities
│   ├── mpa-service.ts          # MPA data fetching
│   ├── obis-client.ts          # OBIS API client
│   └── utils.ts                # Helper functions
├── hooks/
│   ├── useNetworkStatus.ts     # Online/offline detection
│   ├── useGeolocation.ts       # Location access
│   ├── useSwipeGesture.ts      # Touch gestures
│   └── usePrefetch.ts          # Data prefetching
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icons/                  # App icons (all sizes)
│   ├── sw.js                   # Service worker
│   └── screenshots/            # App screenshots
├── styles/
│   └── globals.css             # Tailwind + custom styles
├── types/
│   └── index.ts                # TypeScript definitions
└── next.config.js              # Next.js + PWA config
```

---

## DEVELOPMENT PHASES

### Phase Overview
| Phase | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| 1 | Project Setup & PWA Foundation | 1 week | Installable PWA shell |
| 2 | Core UI & Navigation | 1 week | Mobile navigation system |
| 3 | Map Integration & MPA Display | 1.5 weeks | Interactive map with MPAs |
| 4 | Offline Functionality | 1.5 weeks | Full offline support |
| 5 | Mobile Features | 1.5 weeks | Camera, GPS, gestures |
| 6 | Data Integration | 1 week | OBIS API + species data |
| 7 | Testing & Optimization | 1 week | Performance optimization |
| 8 | Deployment & Launch | 0.5 week | Production deployment |

**Total Duration:** 8-10 weeks

---

## PHASE 1: PROJECT SETUP & PWA FOUNDATION
**Duration:** Week 1 (5 days)
**Goal:** Create installable PWA with basic structure

### Sprint 1.1: Initial Setup (Days 1-2)

#### Tasks
1. **Initialize Next.js Project**
   ```bash
   npx create-next-app@latest ocean-pulse --typescript --tailwind --app
   cd ocean-pulse
   ```
   - Enable App Router
   - Configure TypeScript strict mode
   - Set up Tailwind CSS with mobile-first config

2. **Install PWA Dependencies**
   ```bash
   npm install next-pwa workbox-window idb
   npm install -D @types/node @types/react
   ```

3. **Configure next-pwa**
   - Create `next.config.js` with PWA configuration
   - Set up runtime caching strategies
   - Configure service worker generation
   - Add environment variable handling

4. **Project Structure Setup**
   - Create folder structure (app/, components/, lib/, hooks/)
   - Set up TypeScript path aliases (@/ imports)
   - Configure ESLint and Prettier
   - Initialize Git repository

**Acceptance Criteria:**
- ✓ Next.js app runs on localhost:3000
- ✓ TypeScript compilation with no errors
- ✓ Tailwind CSS working
- ✓ next-pwa generates service worker

---

### Sprint 1.2: PWA Manifest & Icons (Day 3)

#### Tasks
1. **Create PWA Manifest** (`public/manifest.json`)
   - App name: "Ocean PULSE"
   - Short name: "Ocean PULSE"
   - Theme color: #002557 (navy)
   - Background color: #F8FAFB
   - Display: standalone
   - Orientation: portrait-primary
   - Start URL: /
   - Scope: /

2. **Generate App Icons**
   - Create base icon design (512×512px)
   - Generate all required sizes:
     - 72×72, 96×96, 128×128, 144×144
     - 152×152, 192×192, 384×384, 512×512
   - Create maskable icons for Android
   - Add Apple touch icons for iOS
   - Store in `/public/icons/`

3. **Add Manifest to Layout**
   - Link manifest in `app/layout.tsx`
   - Add theme-color meta tag
   - Add viewport meta tag
   - Add Apple-specific meta tags

**Acceptance Criteria:**
- ✓ Manifest validates (Chrome DevTools > Application)
- ✓ All icons display correctly
- ✓ iOS Safari recognizes Apple touch icon
- ✓ Theme color applies to browser chrome

---

### Sprint 1.3: Service Worker Setup (Days 4-5)

#### Tasks
1. **Service Worker Registration**
   - Add registration code to `app/layout.tsx`
   - Implement update detection
   - Add update prompt UI
   - Handle registration errors

2. **Configure Caching Strategies**
   ```javascript
   // next.config.js
   runtimeCaching: [
     {
       urlPattern: /^https:\/\/api\.obis\.org\/.*/,
       handler: 'NetworkFirst',
       options: {
         cacheName: 'obis-api-cache',
         expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
       }
     },
     {
       urlPattern: /.*\.tile\.openstreetmap\.org\/.*/,
       handler: 'CacheFirst',
       options: {
         cacheName: 'map-tiles-cache',
         expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }
       }
     }
   ]
   ```

3. **Offline Fallback Page**
   - Create `/app/offline/page.tsx`
   - Design offline indicator UI (using frontend-design)
   - Add to service worker precache

4. **Test PWA Installation**
   - Test on Chrome Desktop (Add to homescreen)
   - Test on Android Chrome
   - Test on iOS Safari (Add to Home Screen)
   - Verify standalone mode works

**Acceptance Criteria:**
- ✓ Service worker registers successfully
- ✓ App installable on all platforms
- ✓ Offline page displays when no connection
- ✓ Update prompt appears when new version available
- ✓ Lighthouse PWA score >80

**Phase 1 Deliverable:** Installable PWA shell with working service worker

---

## PHASE 2: CORE UI & NAVIGATION
**Duration:** Week 2 (5 days)
**Goal:** Mobile-first navigation and layout system

### Sprint 2.1: Design System Setup (Days 1-2)

#### Tasks
1. **Configure Tailwind for Mobile-First**
   ```javascript
   // tailwind.config.js
   theme: {
     extend: {
       colors: {
         navy: { 600: '#002557', 700: '#001a3d' },
         cyan: { 500: '#00BCD4', 600: '#00ACC1' },
         ocean: { 100: '#E0F7FA', 500: '#0288D1' }
       },
       spacing: {
         'safe-top': 'env(safe-area-inset-top)',
         'safe-bottom': 'env(safe-area-inset-bottom)'
       }
     }
   }
   ```

2. **Create Base UI Components** (using **frontend-design skill**)
   - `components/ui/Button.tsx`
     - Primary, secondary, ghost variants
     - Touch target minimum 44×44px
     - Loading states
     - Icon support

   - `components/ui/Card.tsx`
     - Shadow elevation system
     - Padding responsive to screen size
     - Touch feedback

   - `components/ui/Badge.tsx`
     - Health status indicators
     - Color-coded (green=healthy, yellow=moderate, red=at-risk)

   - `components/ui/Input.tsx`
     - Large touch targets
     - Mobile keyboard optimization
     - Error states

3. **Typography System**
   - Define font sizes (mobile-first)
   - Line height for readability
   - Font weight hierarchy
   - Responsive scaling

**Acceptance Criteria:**
- ✓ All UI components designed with frontend-design skill
- ✓ Touch targets meet accessibility standards
- ✓ Components work on all screen sizes
- ✓ Visual design matches Ocean PULSE branding

---

### Sprint 2.2: Bottom Navigation (Day 3)

#### Tasks
1. **Create BottomNav Component** (using **frontend-design skill**)
   ```typescript
   // components/Navigation/BottomNav.tsx
   interface NavItem {
     href: string
     icon: string | React.ReactNode
     label: string
   }

   const navItems = [
     { href: '/', icon: '🗺️', label: 'Map' },
     { href: '/nearby', icon: '📍', label: 'Nearby' },
     { href: '/observe', icon: '📷', label: 'Observe' },
     { href: '/profile', icon: '👤', label: 'Profile' }
   ]
   ```

2. **Navigation Features**
   - Active state highlighting
   - Smooth transitions
   - Safe area handling (iOS notch)
   - Fixed positioning
   - Z-index management

3. **Route Structure**
   - Create placeholder pages for all routes
   - Set up Next.js App Router navigation
   - Add loading states
   - Implement page transitions

**Acceptance Criteria:**
- ✓ Bottom nav always visible
- ✓ Active state indicates current page
- ✓ Thumb-friendly positioning
- ✓ Safe area insets respected on iOS
- ✓ Navigation works on all routes

---

### Sprint 2.3: Layout & Responsive Design (Days 4-5)

#### Tasks
1. **Root Layout** (`app/layout.tsx`)
   - PWA meta tags
   - Global styles
   - Font loading optimization
   - Service worker registration
   - Offline indicator integration

2. **Page Layouts** (using **frontend-design skill**)
   - **Map Layout:** Full-screen map with floating controls
   - **List Layout:** Scrollable content with bottom nav
   - **Detail Layout:** Header, content, actions
   - **Form Layout:** Optimized for mobile input

3. **Responsive Breakpoints**
   ```css
   /* Mobile: 320px - 640px (default) */
   /* Tablet: 640px - 1024px */
   /* Desktop: 1024px+ */
   ```

4. **Safe Area Handling**
   - iOS notch/Dynamic Island
   - Android gesture bar
   - Floating action button positioning

5. **Loading States** (using **frontend-design skill**)
   - Skeleton screens
   - Spinners
   - Progress indicators
   - Shimmer effects

**Acceptance Criteria:**
- ✓ All layouts responsive across devices
- ✓ Safe areas handled correctly
- ✓ Loading states provide feedback
- ✓ No layout shift (CLS <0.1)

**Phase 2 Deliverable:** Complete mobile navigation system with responsive layouts

---

## PHASE 3: MAP INTEGRATION & MPA DISPLAY
**Duration:** Week 3-4 (7-8 days)
**Goal:** Interactive map with MPA visualization

### Sprint 3.1: Map Setup (Days 1-2)

#### Tasks
1. **Install Leaflet**
   ```bash
   npm install leaflet react-leaflet
   npm install -D @types/leaflet
   ```

2. **Create MobileMap Component**
   ```typescript
   // components/Map/MobileMap.tsx
   - MapContainer configuration
   - TileLayer (OpenStreetMap + ESRI)
   - Mobile-optimized zoom controls
   - Custom control positioning
   - Touch gesture support (pinch-zoom, pan)
   ```

3. **Map Styling**
   - Ocean-themed color scheme
   - High contrast markers
   - Mobile-friendly popup sizing
   - Dark mode support

4. **Dynamic Height Handling**
   - Account for mobile browser chrome
   - Handle orientation changes
   - Adjust for bottom navigation

**Acceptance Criteria:**
- ✓ Map renders on mobile and desktop
- ✓ Touch gestures work smoothly
- ✓ Map tiles cache for offline use
- ✓ Performance >60fps during pan/zoom

---

### Sprint 3.2: MPA Data Layer (Days 3-4)

#### Tasks
1. **MPA Type Definitions**
   ```typescript
   // types/index.ts
   interface MPA {
     id: string
     name: string
     country: string
     bounds: number[][] // [[lat, lng], [lat, lng]]
     center: [number, number]
     area: number // km²
     healthScore: number // 0-100
     speciesCount: number
     establishedYear: number
     protection_level: string
   }
   ```

2. **MPA Service** (`lib/mpa-service.ts`)
   ```typescript
   - fetchAllMPAs(): Promise<MPA[]>
   - fetchMPAById(id: string): Promise<MPA>
   - findNearestMPAs(lat: number, lng: number, limit: number)
   - calculateHealthScore(mpa: MPA): number
   ```

3. **Sample MPA Data**
   - Create mock data for initial development
   - 10-15 sample MPAs worldwide
   - Include various health scores
   - Diverse geographic locations

4. **Data Caching Strategy**
   - Cache MPA list on first load
   - Update cache daily
   - Fallback to cached data if offline

**Acceptance Criteria:**
- ✓ MPA data structure finalized
- ✓ Service functions tested
- ✓ Sample data available
- ✓ Caching working

---

### Sprint 3.3: MPA Visualization (Days 5-7)

#### Tasks
1. **MPA Markers on Map**
   ```typescript
   // components/Map/MPAMarker.tsx
   - Custom marker icons (health-based colors)
   - Cluster markers for dense areas
   - Click to view MPA details
   - Animated marker appearance
   ```

2. **MPA Boundaries**
   - Draw polygons for MPA areas
   - Color-code by health score:
     - Green (≥80): Healthy
     - Yellow (50-79): Moderate
     - Red (<50): At Risk
   - Opacity adjustment for overlap
   - Interactive boundary highlighting

3. **Map Controls** (using **frontend-design skill**)
   - **Zoom Controls:** Large touch targets (+/- buttons)
   - **Locate Button:** Center on user location
   - **Layer Toggle:** Switch between map styles
   - **Filter Button:** Filter MPAs by health/region

4. **MPA Popup Component** (using **frontend-design skill**)
   ```typescript
   // components/Map/MPAPopup.tsx
   - MPA name and country
   - Health score badge
   - Species count
   - "View Details" button
   - Share button
   ```

5. **Performance Optimization**
   - Virtualize markers (only render visible)
   - Debounce map move events
   - Lazy load MPA details
   - Optimize marker icons (SVG)

**Acceptance Criteria:**
- ✓ All MPAs visible on map
- ✓ Markers color-coded by health
- ✓ Boundaries render correctly
- ✓ Popups open on marker click
- ✓ Map performs well with 100+ MPAs

---

### Sprint 3.4: MPA Detail Page (Day 8)

#### Tasks
1. **Create MPA Detail Route** (`app/mpa/[id]/page.tsx`)
   - Dynamic route parameter
   - Fetch MPA data by ID
   - Loading state
   - Error handling (MPA not found)

2. **MPA Detail Components** (using **frontend-design skill**)
   ```typescript
   // components/MPA/MPAHeader.tsx
   - Hero image or map snapshot
   - MPA name and country
   - Health score gauge
   - Back button

   // components/MPA/MPAStats.tsx
   - Area size
   - Species count
   - Established year
   - Protection level
   - Last updated date

   // components/MPA/MPADescription.tsx
   - Full description
   - Conservation goals
   - Regulations

   // components/MPA/MPASpeciesList.tsx
   - Top species in this MPA
   - Species thumbnails
   - "See All" link
   ```

3. **Action Buttons**
   - Navigate to MPA (opens map)
   - Add Observation
   - Share MPA
   - Save for Offline

4. **Offline Indicator**
   - Show if viewing cached data
   - Display last updated timestamp

**Acceptance Criteria:**
- ✓ MPA details load correctly
- ✓ All components designed with frontend-design skill
- ✓ Navigation between map and detail works
- ✓ Responsive on all screen sizes
- ✓ Works offline with cached data

**Phase 3 Deliverable:** Interactive map with MPA visualization and detail pages

---

## PHASE 4: OFFLINE FUNCTIONALITY
**Duration:** Week 4-5 (7-8 days)
**Goal:** Full offline support with IndexedDB

### Sprint 4.1: IndexedDB Setup (Days 1-2)

#### Tasks
1. **Database Schema Design**
   ```typescript
   // lib/offline-storage.ts
   interface OceanPulseDB extends DBSchema {
     'mpas': {
       key: string
       value: MPA & { lastUpdated: number }
     }
     'species-data': {
       key: string // mpaId
       value: {
         mpaId: string
         species: Species[]
         totalRecords: number
         lastUpdated: number
       }
     }
     'observations': {
       key: number
       value: Observation & { synced: boolean }
       indexes: { 'by-sync-status': 'synced', 'by-mpa': 'mpaId' }
     }
     'map-tiles': {
       key: string // tile URL
       value: { blob: Blob, timestamp: number }
     }
   }
   ```

2. **Initialize Database**
   ```typescript
   export async function initDB(): Promise<IDBPDatabase<OceanPulseDB>>
   - Create object stores
   - Define indexes
   - Handle version upgrades
   - Error handling
   ```

3. **CRUD Operations**
   ```typescript
   // MPA Operations
   - cacheMPAData(mpa: MPA): Promise<void>
   - getCachedMPA(id: string): Promise<MPA | null>
   - getAllCachedMPAs(): Promise<MPA[]>
   - deleteCachedMPA(id: string): Promise<void>

   // Species Operations
   - cacheSpeciesData(mpaId: string, species: Species[]): Promise<void>
   - getCachedSpecies(mpaId: string): Promise<Species[]>

   // Observation Operations
   - saveObservation(obs: Observation): Promise<number>
   - getUnsyncedObservations(): Promise<Observation[]>
   - markObservationSynced(id: number): Promise<void>
   ```

4. **Storage Quota Management**
   - Check available storage
   - Implement LRU cache eviction
   - Warn user when storage low
   - Prioritize important data

**Acceptance Criteria:**
- ✓ IndexedDB initializes successfully
- ✓ All CRUD operations work
- ✓ Database persists across sessions
- ✓ Storage quota checked before writes

---

### Sprint 4.2: Network Detection (Day 3)

#### Tasks
1. **Create useNetworkStatus Hook**
   ```typescript
   // hooks/useNetworkStatus.ts
   export function useNetworkStatus() {
     const [isOnline, setIsOnline] = useState(true)
     const [connectionType, setConnectionType] = useState<string>('unknown')
     const [effectiveType, setEffectiveType] = useState<string>('4g')

     return { isOnline, connectionType, effectiveType }
   }
   ```

2. **Network Status Indicator** (using **frontend-design skill**)
   ```typescript
   // components/OfflineIndicator.tsx
   - Fixed position banner
   - Shows when offline
   - Shows when on slow connection (2G)
   - Auto-hide after 5 seconds when back online
   ```

3. **Connection Type Handling**
   - Detect WiFi vs cellular
   - Adjust data fetching based on connection
   - Reduce image quality on slow connections
   - Defer non-critical requests

**Acceptance Criteria:**
- ✓ Offline detection works immediately
- ✓ Indicator appears when offline
- ✓ Connection type detected correctly
- ✓ App behavior adapts to connection speed

---

### Sprint 4.3: Offline Data Management (Days 4-6)

#### Tasks
1. **Cache MPA Data on View**
   ```typescript
   // When user views an MPA, cache it
   - Cache MPA metadata
   - Cache species list
   - Cache map tiles in viewport
   - Store last updated timestamp
   ```

2. **Offline MPA List**
   ```typescript
   // app/offline/page.tsx
   - Display all cached MPAs
   - Show storage used
   - Allow manual download for offline
   - Bulk download nearby MPAs
   - Delete cached MPAs
   ```

3. **Smart Prefetching**
   - Prefetch nearby MPAs based on location
   - Prefetch likely next pages
   - Prefetch during idle time
   - Background download on WiFi

4. **Data Sync Strategy**
   ```typescript
   // lib/sync-service.ts
   - syncUnsyncedObservations(): Promise<void>
   - syncMPAUpdates(): Promise<void>
   - syncInBackground(): void
   - handleSyncConflicts(): void
   ```

5. **Update Notifications** (using **frontend-design skill**)
   - Notify when new data available
   - Ask to update cached MPAs
   - Show sync progress
   - Handle sync errors gracefully

**Acceptance Criteria:**
- ✓ MPAs cached automatically on view
- ✓ Offline page shows cached content
- ✓ Manual download works
- ✓ Sync happens automatically when online
- ✓ No data loss during offline period

---

### Sprint 4.4: Offline UI Enhancements (Days 7-8)

#### Tasks
1. **Cached Data Indicators**
   - Badge on MPA cards showing "Offline Available"
   - Last updated timestamp
   - Cache size indicator
   - Outdated data warning (>7 days)

2. **Offline Actions**
   - Gray out unavailable features
   - Queue actions for later sync
   - Show "Will sync when online" messages
   - Retry failed requests

3. **Skeleton Screens** (using **frontend-design skill**)
   - MPA list skeleton
   - Map loading skeleton
   - Detail page skeleton
   - Smooth transition to loaded state

4. **Error States** (using **frontend-design skill**)
   - No cached data available
   - Sync failed
   - Storage quota exceeded
   - Network timeout

**Acceptance Criteria:**
- ✓ User always knows if viewing cached data
- ✓ Offline limitations clearly communicated
- ✓ Loading states prevent confusion
- ✓ Errors provide actionable guidance

**Phase 4 Deliverable:** Full offline support with automatic caching and sync

---

## PHASE 5: MOBILE FEATURES
**Duration:** Week 5-6 (7-8 days)
**Goal:** Geolocation, camera, and touch interactions

### Sprint 5.1: Geolocation Integration (Days 1-2)

#### Tasks
1. **Create useGeolocation Hook**
   ```typescript
   // hooks/useGeolocation.ts
   export function useGeolocation() {
     const [location, setLocation] = useState<Location | null>(null)
     const [error, setError] = useState<string | null>(null)
     const [loading, setLoading] = useState(true)
     const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt')

     // watchPosition with high accuracy
     // Handle permission denied
     // Clear watch on unmount

     return { location, error, loading, permissionStatus, requestPermission }
   }
   ```

2. **Permission Request Flow** (using **frontend-design skill**)
   ```typescript
   // components/LocationPermissionPrompt.tsx
   - Explain why location needed
   - Show example use cases
   - "Allow Location" button
   - "Not Now" option
   - Don't show again if denied
   ```

3. **Location-Based Features**
   - Show user marker on map
   - Auto-center map on user location
   - Calculate distance to MPAs
   - Sort nearby MPAs by distance

4. **Background Location** (where supported)
   - Track location for observation tagging
   - Geofence alerts near MPAs
   - Battery-efficient tracking

**Acceptance Criteria:**
- ✓ Location permission requested gracefully
- ✓ User location shown on map
- ✓ Distance calculations accurate
- ✓ Battery efficient (<5% drain)

---

### Sprint 5.2: Nearby MPAs Feature (Day 3)

#### Tasks
1. **Nearby MPAs Page** (`app/nearby/page.tsx`)
   ```typescript
   - Request location permission
   - Calculate distances to all MPAs
   - Sort by distance (closest first)
   - Display in list view
   ```

2. **Nearby MPA Card** (using **frontend-design skill**)
   ```typescript
   // components/MPA/NearbyMPACard.tsx
   - MPA name
   - Distance (km or miles based on locale)
   - Health score badge
   - Direction indicator
   - "Navigate" button
   ```

3. **Map View Toggle**
   - Switch between list and map view
   - Show user location + nearby MPAs
   - Draw radius circle (e.g., 50km)

4. **Filters**
   - Distance radius slider
   - Health score filter
   - Country filter
   - Sort options (distance, health, name)

**Acceptance Criteria:**
- ✓ Nearby MPAs load based on location
- ✓ Distance calculations correct
- ✓ List and map views both work
- ✓ Filters update results instantly

---

### Sprint 5.3: Camera Integration (Days 4-5)

#### Tasks
1. **Create CameraCapture Component** (using **frontend-design skill**)
   ```typescript
   // components/Observation/CameraCapture.tsx
   - Request camera permission
   - Access device camera (prefer back camera)
   - Live video preview
   - Capture button (large, bottom center)
   - Flash toggle
   - Camera flip button
   - Gallery access (pick existing photo)
   ```

2. **Camera Permission Flow**
   ```typescript
   // Explain why camera needed
   // Show sample observations
   // Request permission
   // Fallback to file upload if denied
   ```

3. **Photo Capture**
   - Capture at high quality (95% JPEG)
   - Auto-compress if >2MB
   - Store as Blob in IndexedDB
   - Generate thumbnail for preview
   - Extract EXIF data (location, timestamp)

4. **Photo Preview** (using **frontend-design skill**)
   ```typescript
   // Show captured photo
   // Retake option
   // Confirm and continue
   // Add filters (optional)
   ```

**Acceptance Criteria:**
- ✓ Camera opens on device
- ✓ Back camera used by default
- ✓ Photos captured and stored
- ✓ EXIF data extracted
- ✓ Works on iOS and Android

---

### Sprint 5.4: Observation Form (Day 6)

#### Tasks
1. **Create Observation Page** (`app/observe/page.tsx`)
   ```typescript
   // Multi-step form:
   // Step 1: Select MPA (or use current location)
   // Step 2: Capture photo
   // Step 3: Add details (species, notes)
   // Step 4: Review and submit
   ```

2. **Observation Form Components** (using **frontend-design skill**)
   ```typescript
   // components/Observation/MPASelector.tsx
   - Dropdown or autocomplete
   - Show nearby MPAs first
   - Search by name

   // components/Observation/ObservationForm.tsx
   - Species name input (autocomplete)
   - Notes textarea
   - Quantity number input
   - Behavior checkboxes
   - Timestamp (auto-filled)
   - Location (auto-filled from GPS)
   ```

3. **Form Validation**
   - Photo required
   - MPA required
   - Species name (optional but recommended)
   - Notes (optional)
   - Location tag (auto or manual)

4. **Submission**
   ```typescript
   - Save to IndexedDB as unsynced
   - Show success message
   - Offer to add another observation
   - Sync when online
   ```

**Acceptance Criteria:**
- ✓ Form easy to complete on mobile
- ✓ Validation prevents incomplete submissions
- ✓ Observations saved offline
- ✓ Success feedback provided

---

### Sprint 5.5: Touch Gestures (Days 7-8)

#### Tasks
1. **Create useSwipeGesture Hook**
   ```typescript
   // hooks/useSwipeGesture.ts
   export function useSwipeGesture(config: SwipeConfig) {
     // Detect swipe left, right, up, down
     // Configurable threshold (default 50px)
     // Velocity detection
     return { handleTouchStart, handleTouchMove, handleTouchEnd }
   }
   ```

2. **Implement Swipe Navigation**
   - Swipe left/right on MPA cards (next/previous)
   - Swipe down to dismiss modals
   - Swipe up for more details (bottom sheet)

3. **Pull-to-Refresh**
   ```typescript
   // components/PullToRefresh.tsx
   - Detect pull-down gesture
   - Show refresh indicator
   - Trigger data refresh
   - Animate completion
   ```

4. **Long Press Actions**
   - Long press MPA marker → Quick actions menu
   - Long press observation → Edit/Delete

5. **Haptic Feedback**
   - Vibrate on actions (if supported)
   - Tactile feedback for button presses

**Acceptance Criteria:**
- ✓ Swipe gestures feel natural
- ✓ Pull-to-refresh works smoothly
- ✓ Long press actions discoverable
- ✓ No conflict with map gestures

**Phase 5 Deliverable:** Full mobile features including camera, GPS, and gestures

---

## PHASE 6: DATA INTEGRATION
**Duration:** Week 7 (5 days)
**Goal:** Connect to OBIS API and display real species data

### Sprint 6.1: OBIS API Client (Days 1-2)

#### Tasks
1. **Create OBIS Client**
   ```typescript
   // lib/obis-client.ts
   class OBISClient {
     async searchOccurrences(params: SearchParams): Promise<Occurrence[]>
     async getSpeciesByArea(geometry: Polygon): Promise<Species[]>
     async getSpeciesDetails(scientificName: string): Promise<SpeciesDetail>
     async getTaxonomy(taxonKey: number): Promise<Taxonomy>
   }
   ```

2. **API Endpoints**
   - `/occurrence/search` - Get species occurrences
   - `/taxon` - Get species taxonomy
   - `/area` - Get occurrences by area (MPA bounds)

3. **Request Handling**
   - Add API key if required
   - Rate limiting (respect OBIS limits)
   - Retry logic with exponential backoff
   - Timeout handling (10s max)
   - Error messages

4. **Response Caching**
   - Cache species data for 24 hours
   - Cache taxonomy indefinitely
   - Store in IndexedDB
   - Fallback to cached data if API fails

**Acceptance Criteria:**
- ✓ OBIS API calls succeed
- ✓ Data parsed correctly
- ✓ Errors handled gracefully
- ✓ Caching reduces API calls

---

### Sprint 6.2: Species Data Display (Days 3-4)

#### Tasks
1. **Fetch Species for MPA**
   ```typescript
   // When user views MPA detail:
   - Get MPA bounds
   - Query OBIS for occurrences in bounds
   - Group by species
   - Count occurrences per species
   - Sort by occurrence count
   ```

2. **Species List Component** (using **frontend-design skill**)
   ```typescript
   // components/Species/SpeciesList.tsx
   - Virtualized list for performance
   - Species thumbnail (if available)
   - Scientific name
   - Common name
   - Occurrence count
   - Last seen date
   - Conservation status badge
   ```

3. **Species Detail Modal** (using **frontend-design skill**)
   ```typescript
   // components/Species/SpeciesDetailModal.tsx
   - Species photo
   - Scientific name
   - Common names (multiple languages)
   - Taxonomy (Kingdom → Species)
   - Conservation status
   - Habitat description
   - Recent sightings in this MPA
   - "Report Sighting" button
   ```

4. **Species Search & Filter**
   - Search by name (scientific or common)
   - Filter by taxonomy (Fish, Coral, Mammal, etc.)
   - Filter by conservation status
   - Sort by name, occurrence, last seen

**Acceptance Criteria:**
- ✓ Species load for each MPA
- ✓ List displays correctly
- ✓ Detail modal shows full info
- ✓ Search and filters work

---

### Sprint 6.3: Data Visualization (Day 5)

#### Tasks
1. **MPA Health Score Calculation**
   ```typescript
   // lib/health-calculator.ts
   - Species diversity index
   - Total occurrence count
   - Endangered species presence
   - Data freshness (recent observations)
   - Calculate 0-100 score
   ```

2. **Health Gauge Component** (using **frontend-design skill**)
   ```typescript
   // components/MPA/HealthGauge.tsx
   - Circular progress indicator
   - Color gradient (red → yellow → green)
   - Large score number
   - Health status label
   ```

3. **Species Chart** (using **frontend-design skill**)
   ```typescript
   // components/Charts/SpeciesChart.tsx
   - Bar chart: Top 10 species by occurrence
   - Pie chart: Species by taxonomy group
   - Line chart: Observations over time
   - Mobile-optimized (horizontal scroll if needed)
   ```

4. **Statistics Cards** (using **frontend-design skill**)
   - Total species count
   - Total observations
   - Unique contributors
   - Last updated

**Acceptance Criteria:**
- ✓ Health scores calculated correctly
- ✓ Charts display accurate data
- ✓ Visualizations responsive on mobile
- ✓ Performance good even with large datasets

**Phase 6 Deliverable:** Live species data from OBIS displayed in app

---

## PHASE 7: TESTING & OPTIMIZATION
**Duration:** Week 8 (5 days)
**Goal:** Performance optimization and comprehensive testing

### Sprint 7.1: Performance Optimization (Days 1-2)

#### Tasks
1. **Lighthouse Audit**
   ```bash
   npm run build
   npm run start
   lighthouse http://localhost:3000 --view
   ```
   - Target: Performance >90
   - Target: PWA >90
   - Target: Accessibility >90
   - Target: Best Practices >90

2. **Performance Improvements**
   ```typescript
   // Image optimization
   - Use Next.js Image component
   - Lazy load images
   - Use WebP format
   - Responsive image sizes

   // Code splitting
   - Dynamic imports for heavy components
   - Route-based code splitting
   - Lazy load charts/maps

   // Bundle optimization
   - Tree shaking
   - Remove unused dependencies
   - Minify CSS/JS
   - Compress assets
   ```

3. **Caching Optimization**
   - Aggressive service worker caching
   - Stale-while-revalidate for API calls
   - Cache map tiles aggressively
   - Precache critical assets

4. **Database Optimization**
   - Index frequently queried fields
   - Batch database writes
   - Optimize query patterns
   - Limit result sets

**Acceptance Criteria:**
- ✓ Lighthouse Performance >90
- ✓ First Contentful Paint <1.8s
- ✓ Time to Interactive <3.8s
- ✓ Bundle size <200KB (initial)

---

### Sprint 7.2: Mobile Testing (Day 3)

#### Tasks
1. **Device Testing Matrix**
   ```
   iOS:
   - iPhone SE (small screen)
   - iPhone 14 Pro (notch)
   - iPhone 14 Pro Max (large screen)
   - iPad Air (tablet)

   Android:
   - Samsung Galaxy S21 (high-end)
   - Google Pixel 6
   - Budget Android (mid-range)
   ```

2. **Test Scenarios**
   - Install PWA on each device
   - Test all gestures (swipe, pinch, long-press)
   - Verify camera access
   - Test geolocation
   - Offline mode
   - Map performance
   - Form submissions
   - Data sync

3. **Browser Testing**
   - iOS Safari
   - Android Chrome
   - Samsung Internet
   - Firefox Mobile

**Acceptance Criteria:**
- ✓ App works on all test devices
- ✓ No visual glitches
- ✓ Features work as expected
- ✓ Performance acceptable on low-end devices

---

### Sprint 7.3: Accessibility Testing (Day 4)

#### Tasks
1. **Screen Reader Testing**
   - VoiceOver (iOS)
   - TalkBack (Android)
   - All interactive elements labeled
   - Navigation order logical

2. **Keyboard Navigation**
   - All features accessible via keyboard
   - Focus indicators visible
   - Tab order logical
   - Escape closes modals

3. **WCAG 2.1 AA Compliance**
   - Color contrast >4.5:1
   - Text resizable to 200%
   - No flashing content
   - Alt text for images
   - Form labels present

4. **Accessibility Fixes**
   - Add ARIA labels where needed
   - Improve color contrast
   - Add skip links
   - Enhance focus management

**Acceptance Criteria:**
- ✓ Lighthouse Accessibility >90
- ✓ Screen reader navigation works
- ✓ WCAG 2.1 AA compliant
- ✓ Keyboard navigation smooth

---

### Sprint 7.4: Integration Testing (Day 5)

#### Tasks
1. **Critical User Flows**
   ```typescript
   // Test with Playwright or Cypress

   // Flow 1: New User
   - Open app
   - Install to homescreen
   - Allow location
   - View nearby MPAs
   - Explore MPA details

   // Flow 2: Add Observation
   - Open observe page
   - Allow camera
   - Capture photo
   - Fill form
   - Submit
   - Verify saved

   // Flow 3: Offline Usage
   - View MPA online
   - Go offline
   - View same MPA (cached)
   - Add observation (queued)
   - Go online
   - Verify sync
   ```

2. **Error Scenarios**
   - API failures
   - Network timeouts
   - Storage quota exceeded
   - Invalid data inputs
   - Permission denials

3. **Edge Cases**
   - No MPAs nearby
   - GPS disabled
   - Camera not available
   - Very slow connection
   - Old browser

**Acceptance Criteria:**
- ✓ All critical flows pass
- ✓ Error handling works
- ✓ Edge cases handled gracefully
- ✓ No unhandled exceptions

**Phase 7 Deliverable:** Fully tested, optimized, production-ready app

---

## PHASE 8: DEPLOYMENT & LAUNCH
**Duration:** Week 8 (2-3 days)
**Goal:** Deploy to production and launch

### Sprint 8.1: Production Deployment (Days 1-2)

#### Tasks
1. **Environment Setup**
   ```bash
   # Production environment variables
   NEXT_PUBLIC_API_URL=https://api.obis.org
   NEXT_PUBLIC_APP_URL=https://oceanpulse.app
   NODE_ENV=production
   ```

2. **Vercel Deployment**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod

   # Configure domain
   vercel domains add oceanpulse.app
   vercel domains add www.oceanpulse.app
   ```

3. **SSL Certificate**
   - Automatic via Vercel/Cloudflare
   - Force HTTPS
   - Configure HSTS headers

4. **CDN Configuration**
   - Enable edge caching
   - Configure cache headers
   - Optimize for global distribution

5. **Environment Variables**
   - Set all production secrets
   - Configure API keys
   - Set up error tracking (Sentry)

**Acceptance Criteria:**
- ✓ App deployed to production URL
- ✓ HTTPS working
- ✓ CDN configured
- ✓ Environment variables set

---

### Sprint 8.2: Monitoring & Analytics (Day 2)

#### Tasks
1. **Error Tracking (Sentry)**
   ```bash
   npm install @sentry/nextjs
   ```
   - Configure Sentry
   - Set up error alerts
   - Source maps uploaded
   - User context captured

2. **Analytics (optional)**
   ```typescript
   // Privacy-focused analytics (Plausible/Umami)
   - Page views
   - User flows
   - Installation rate
   - Feature usage
   - No personal data collection
   ```

3. **Performance Monitoring**
   - Real User Monitoring (RUM)
   - Core Web Vitals tracking
   - API response times
   - Error rates

**Acceptance Criteria:**
- ✓ Error tracking working
- ✓ Analytics collecting data
- ✓ Performance monitoring active
- ✓ Alerts configured

---

### Sprint 8.3: Launch Preparation (Day 3)

#### Tasks
1. **Pre-Launch Checklist**
   - [ ] All features tested
   - [ ] Lighthouse scores >90
   - [ ] Security audit passed
   - [ ] Privacy policy added
   - [ ] Terms of service added
   - [ ] Help/FAQ page created
   - [ ] Contact form/email added
   - [ ] Backup strategy in place
   - [ ] Rollback plan documented

2. **App Store Assets (if using TWA)**
   - Screenshots (mobile + tablet)
   - App icon
   - Store listing description
   - Privacy policy link
   - Feature graphic

3. **Documentation**
   - User guide
   - API documentation
   - Deployment guide
   - Troubleshooting guide

4. **Launch Announcement**
   - Landing page updated
   - Social media posts prepared
   - Press release (if applicable)
   - Email to beta testers

**Acceptance Criteria:**
- ✓ All checklist items complete
- ✓ Documentation ready
- ✓ Launch plan finalized

**Phase 8 Deliverable:** Live, production-ready Ocean PULSE PWA

---

## UI COMPONENT SPECIFICATIONS

### Design System Guidelines

All UI components should be created using the **frontend-design skill** with the following specifications:

#### Color Palette
```css
/* Primary Colors */
--navy-700: #001a3d;      /* Primary dark */
--navy-600: #002557;      /* Primary */
--ocean-500: #0288D1;     /* Ocean blue */
--cyan-600: #00ACC1;      /* Accent dark */
--cyan-500: #00BCD4;      /* Accent */

/* Health Status Colors */
--health-high: #10B981;   /* Green - Healthy (≥80) */
--health-med: #F59E0B;    /* Yellow - Moderate (50-79) */
--health-low: #EF4444;    /* Red - At Risk (<50) */

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-600: #4B5563;
--gray-900: #111827;
```

#### Typography
```css
/* Font Sizes (Mobile First) */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Spacing
```css
/* Based on 4px grid */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
```

#### Touch Targets
- **Minimum:** 44×44px (iOS standard)
- **Recommended:** 48×48px (Android standard)
- **Spacing:** 8px between interactive elements

#### Component Requirements

**All components created with frontend-design skill must include:**
1. **Mobile-first responsive design**
2. **Touch-optimized interactions**
3. **Loading states**
4. **Error states**
5. **Empty states**
6. **Accessibility (ARIA labels, keyboard nav)**
7. **Dark mode support (future)**

---

## TESTING STRATEGY

### Testing Pyramid

```
                  ┌────────────┐
                  │  E2E Tests │  10%
                  └────────────┘
               ┌──────────────────┐
               │ Integration Tests│  20%
               └──────────────────┘
          ┌──────────────────────────┐
          │     Unit Tests           │  70%
          └──────────────────────────┘
```

### Unit Testing
```bash
# Framework: Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Test Coverage Targets:**
- Utilities: 90%
- Hooks: 80%
- Components: 70%
- API clients: 90%

**Key Test Files:**
- `lib/offline-storage.test.ts`
- `lib/mpa-service.test.ts`
- `lib/obis-client.test.ts`
- `hooks/useNetworkStatus.test.ts`
- `hooks/useGeolocation.test.ts`

### Integration Testing
```bash
# Framework: Playwright
npm install -D @playwright/test
```

**Test Scenarios:**
- Map interaction flows
- Observation submission
- Offline data sync
- Navigation flows

### E2E Testing
**Critical User Journeys:**
1. Install PWA → View MPAs → Explore details
2. Add observation offline → Sync when online
3. Find nearby MPAs → Navigate to location

### Manual Testing Checklist

**Installation:**
- [ ] Android Chrome: Add to Home Screen
- [ ] iOS Safari: Add to Home Screen
- [ ] Desktop Chrome: Install button appears

**Offline:**
- [ ] View cached MPA offline
- [ ] Add observation offline
- [ ] Sync when back online
- [ ] Offline indicator displays

**Mobile Features:**
- [ ] Camera captures photo
- [ ] GPS shows user location
- [ ] Swipe gestures work
- [ ] Pull-to-refresh works

**Performance:**
- [ ] Map loads <2s on 3G
- [ ] App interactive <4s
- [ ] No layout shifts
- [ ] Smooth 60fps scrolling

---

## RISK MANAGEMENT

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OBIS API downtime | Medium | High | Cache data aggressively, show cached |
| Browser compatibility | Low | Medium | Test on all major browsers, polyfills |
| Storage quota exceeded | Medium | Medium | Implement LRU eviction, warn users |
| GPS inaccuracy | Medium | Low | Use high accuracy mode, show error margin |
| Camera access denied | Medium | Medium | Fallback to file upload |
| Slow network | High | Medium | Adaptive loading, show offline mode |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | Medium | High | Strict feature prioritization |
| Timeline delays | Medium | Medium | Buffer time in schedule, MVP first |
| Browser API changes | Low | High | Stay updated on PWA standards |
| Budget overrun | Low | Medium | Track hours weekly, adjust scope |

### Contingency Plans

**If OBIS API issues:**
- Use cached/sample data
- Implement fallback data source
- Display disclaimer about data freshness

**If performance targets not met:**
- Reduce image sizes
- Simplify animations
- Defer non-critical features
- Implement pagination

**If timeline tight:**
- Cut nice-to-have features
- Focus on MVP
- Phase 2 features post-launch

---

## SUCCESS CRITERIA

### MVP (Minimum Viable Product)
- ✓ Installable PWA on iOS and Android
- ✓ Interactive map with MPA markers
- ✓ MPA detail pages with species data
- ✓ Offline support for cached MPAs
- ✓ Basic observation capture
- ✓ Mobile-optimized UI
- ✓ Lighthouse PWA score >85

### Full Launch
- ✓ All features from Phase 1-8 implemented
- ✓ Camera and GPS integration
- ✓ Full offline functionality with sync
- ✓ Touch gestures and mobile interactions
- ✓ Performance: Lighthouse >90 all metrics
- ✓ Tested on 10+ devices
- ✓ Production deployment with monitoring

### Post-Launch (Future Enhancements)
- Push notifications for MPA alerts
- Community features (comments, ratings)
- Gamification (badges for observations)
- Species identification AI
- Dark mode
- Multiple language support
- Native app wrappers (TWA)

---

## NEXT STEPS

### Immediate Actions (Week 1)
1. **Setup Development Environment**
   - Initialize Next.js project
   - Install dependencies
   - Configure PWA

2. **Create Project Repository**
   - Initialize Git
   - Set up GitLab/GitHub
   - Configure CI/CD pipeline

3. **Design Assets**
   - Create app icon
   - Design logo
   - Screenshot mockups for stores

4. **Team Kickoff**
   - Review this plan
   - Assign responsibilities
   - Set up communication channels
   - Schedule daily standups

### Weekly Reviews
- Every Monday: Sprint planning
- Every Friday: Sprint review & demo
- Adjust plan based on progress

### Communication
- Daily standups (15 min)
- Weekly client updates
- Slack/Discord for async
- GitHub issues for bug tracking

---

## CONCLUSION

This plan provides a comprehensive roadmap for building Ocean PULSE as a Progressive Web App. By following this phased approach, we will:

1. **Deliver quickly:** MVP in 4-5 weeks, full launch in 8-10 weeks
2. **Stay mobile-first:** Every decision optimized for mobile users
3. **Work offline:** Critical for remote marine locations
4. **Keep costs low:** Single codebase for all platforms
5. **Iterate fast:** PWA allows instant updates

**Key to success:**
- Use **frontend-design skill** for all UI components
- Test on real devices frequently
- Prioritize performance and offline functionality
- Stay focused on core marine conservation mission

**Let's build something amazing! 🌊**

---

**Document Version:** 1.0
**Created:** December 18, 2024
**Owner:** Ocean PULSE Development Team
**Next Review:** End of Phase 1 (Week 1)
