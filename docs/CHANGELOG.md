# Changelog

All notable changes to Ocean PULSE will be documented in this file.

---

## 2026-03-17

### Added
- **Marine Litter Monitoring (Phase 1)**
  - `marine_litter` report type added to `report_type` enum
  - `litter_items` (JSONB), `litter_weight_kg` (NUMERIC), `survey_length_m` (INT) columns on observations
  - Updated `create_observation_with_health` RPC with litter parameters
  - `types/marine-litter.ts` with OSPAR J-code item definitions (70+ items), material/source configs
  - `LitterDetails` component with Quick Report / OSPAR Survey mode toggle
  - `LitterItemPicker` component with progressive disclosure (10 common items, expandable to full OSPAR list)
  - `LitterHotspotLayer` map layer with heatmap (low zoom) and circle markers (high zoom)
  - `LitterHotspotLegend` component with MSFD intensity classification
  - EMODnet Chemistry beach litter data service (`lib/emodnet-litter.ts`) with fallback dataset
  - `showLitterHotspots` filter toggle in MapFilterPanel
  - Two litter gamification badges: `beach_guardian` (1 report) and `litter_tracker` (10 reports)
  - Updated `check_and_award_badges` RPC with litter badge logic
  - Observation form integration: litter section shown when marine_litter type selected

- **Gamification & Community Engagement System**
  - 9 achievement badges across observation, collection, streak, and verification categories
  - `user_badges` and `user_streaks` tables with RLS policies
  - `user_species_collection` view aggregating per-user species life list
  - `check_and_award_badges` RPC function with automatic notification on badge earn
  - `update_observation_streak` RPC function tracking consecutive-day streaks
  - `get_leaderboard` RPC function supporting observations/species/verifications, monthly/all-time, optional MPA filter
  - Database trigger on observation insert to auto-update streaks and check badges
  - Service layer (`lib/gamification-service.ts`) following verification-service pattern
  - `useGamification` and `useLeaderboard` hooks
  - UI components: AchievementBadge, BadgesGrid, StreakCounter, SpeciesCollection, LeaderboardCard
  - Profile page integration with badges grid, streak counter, species collection, and leaderboard sections
  - Dynamic profile title badge based on highest earned achievement

---

## 2026-03-16

### Added
- **Real-Time Beach & Coastal Conditions** for local communities
  - Live weather, water temperature, wave height, UV levels, wind, and visibility on MPA detail pages
  - Swim safety assessment based on wave height, currents, and weather conditions
  - UV risk level indicators with protective advice
  - Weather-based water quality estimation with clear disclaimer
  - "What's Around Today?" section showing recent species sightings near each MPA
  - Monthly marine educational tips ("Did you know?")
  - Offline caching with 30-minute TTL and staleness indicator
  - Data sourced from Open-Meteo Weather and Marine APIs (free, no API key)
  - IndexedDB store (v7) for coastal conditions cache
- **Observation Verification & Community Validation System** (iNaturalist-style)
  - Quality tiers for observations: Casual, Needs ID, Community Verified, Research Grade
  - Community verification workflow: agree with species ID or suggest alternatives
  - Expert votes weighted 2x in consensus calculations
  - Automatic tier upgrades based on community agreement (2+ votes, 2/3 majority)
  - Real-time notifications for observation owners when verifications are submitted or tiers upgrade
  - Notification bell in app header with unread count and dropdown
  - Quality tier filter pills on Live Reports (All, Needs ID, Verified, Research Grade)
  - Quality tier badges on observation cards with tooltip descriptions
  - Dedicated `/verify` page with feed of observations needing identification
  - Verification stats on user profile page (total verifications, agreements, suggestions)
  - Database migration with RLS policies, RPC functions, and consensus computation
  - Backfill logic to classify existing observations as Casual or Needs ID

### Changed
- Health score community assessment now only counts verified observations (community_verified or research_grade tier)
- Observation cards now show quality tier badge alongside report type
- Live Reports component supports tier-based filtering
- App header now includes notification bell for authenticated users

---

## 2026-02-27

### Added
- **Offshore Wind Farm Map Layer** sourced from EMODnet Human Activities and OSPAR Commission
  - 600+ EMODnet polygon features merged with 278 OSPAR records across European waters
  - Intelligent deduplication by normalized name and country, with OSPAR metadata enrichment
  - Color-coded by development status (Operational, Under Construction, Planned, etc.)
  - Toggleable via the Filters panel alongside existing SST and Fishing Pressure layers
  - Legend component with status breakdown, total capacity, and MPA conflict count
  - Labels visible at higher zoom levels for individual farm identification
- **Wind Farm vs MPA Conflict Detection** using bounding box spatial overlap
  - Automatically identifies wind farms whose footprints intersect Marine Protected Areas
  - Summary statistics including total farms, capacity in GW, and number of MPA conflicts
- **Wind Farm Conflict Section on MPA Detail Pages**
  - New "Offshore Wind Farms" collapsible card on each MPA detail page
  - Shows conflict alert banner when overlapping wind farms are detected
  - Individual wind farm cards with name, country, status, capacity, turbine count, and developer
  - OSPAR-enriched metadata: operator, foundation type, water depth, EIA status, device type
  - Source badges showing data provenance (EMODnet, OSPAR, or merged)
  - Badge indicator showing conflict count or "Clear" status
- New TypeScript types for wind farm data from both EMODnet and OSPAR (`types/wind-farms.ts`)
- Wind farm data service with dual EMODnet + OSPAR WFS integration and merge logic (`lib/wind-farm-service.ts`)
- TanStack Query hook for wind farm data with 24-hour caching (`hooks/useWindFarmData.ts`)

---

## 2025-01-22

### Added
- MapLibre GL JS integration replacing React-Leaflet for improved performance and future layer/filtering capabilities
- Marker hover functionality with popup on hover (desktop) and click (mobile)
- Smooth popup transitions when moving mouse from marker to popup card
- **Map filter panel** with collapsible sections inspired by MPAtlas:
  - Health Status filter (Excellent, Good, Moderate, Poor)
  - Protection Level filter (from WDPA data)
  - Area Size filter (Very Large, Large, Medium, Small)
  - Country filter (sorted by MPA count)
  - Real-time filter counts and "Clear all" functionality
  - Slide-in panel with smooth animations
- "Support Us" button in landing page navigation and CTA section linking to Balean projects

### Changed

**Brand & Design**
- Migrated UI to new Balean brand design system
- Updated color palette with balean-cyan, balean-coral, balean-yellow, and balean-navy
- New gradient styles for icons and accents (cyan to coral to yellow)
- Updated typography and component styling across all pages
- Logo updated to "Ocean PULSE" with "by Balean" subtitle
- Consistent branding between landing page and app

**User Experience**
- App now opens directly on interactive map when launched from landing page
- User journey now always starts at landing page (not directly to app)
- Authentication only required when adding observations (frictionless entry)
- Streamlined landing page CTA to single "Launch App" action

### Fixed
- 404 errors on MPA navigation links
- "View on Map" link from MPA details pages now routes correctly to app map view
- World map no longer repeats when zoomed out
- Health score card clickability on MPA details page
- PWA manifest shortcuts now use correct `/ocean-pulse-app/...` paths
- MPA popup cards now position dynamically based on marker screen position (left/right/center) to prevent cutoff at screen edges
- Bottom nav "Species" button now links to `/ocean-pulse-app/indicator-species`

### Removed
- "Sign In" and "Create Free Account" buttons from landing page
- Testimonials section (commented out as placeholder for future use)

---

## 2025-01-01 - Initial Release

### Added
- Interactive map with 100+ Marine Protected Areas worldwide
- MPA details pages with health scores, species data, and environmental metrics
- Species browser with 15K+ tracked species from OBIS
- Observation submission with photo upload and GPS tagging
- Offline-first PWA functionality with IndexedDB storage
- Real-time health score calculations from multiple data sources
- Satellite tracking data integration from Movebank
- Environmental data from OBIS-ENV-DATA
- User authentication via Supabase
- Saved MPAs functionality
- Nearby MPAs discovery using geolocation
