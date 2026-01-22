# Changelog

All notable changes to Ocean PULSE will be documented in this file.

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
