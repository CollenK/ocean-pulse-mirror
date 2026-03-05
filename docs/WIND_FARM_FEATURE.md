# Wind Farm vs MPA Conflict Layer

## Executive Summary

Ocean Pulse now visualizes **offshore wind farm developments across European waters** and automatically detects where they spatially overlap with Marine Protected Areas (MPAs). This feature directly supports the upcoming Vinnovate grant pitch by demonstrating that Ocean Pulse can serve as a decision-support tool for marine spatial planning, not just a public conservation dashboard.

**What it does:** Pulls 600+ wind farm polygon boundaries from two authoritative open datasets (EMODnet and OSPAR), renders them on the map color-coded by development status, and flags every instance where a wind farm footprint intersects an MPA boundary.

**Why it matters:** Offshore wind is expanding rapidly across European seas, and regulators, developers, and conservation bodies all need tools that show where industrial development overlaps with protected habitats. Ocean Pulse is now uniquely positioned to provide that view, combining biodiversity data it already holds with spatial energy infrastructure data.

**Data sources:** EMODnet Human Activities (European Marine Observation and Data Network) and the OSPAR Commission Offshore Renewables dataset. Both are free, public, and require no API keys. OSPAR data is CC0 (public domain).

---

## Architecture Overview

The feature follows the existing codebase patterns exactly: a service layer fetches and normalizes data, a TanStack Query hook provides caching and derived state, and presentational components render the results on the map and MPA detail pages.

```
Data Sources (WFS)          Service Layer              Hook Layer              Components
  EMODnet WFS  ------>  wind-farm-service.ts  --->  useWindFarmData.ts  --->  WindFarmLayer.tsx
  OSPAR WFS    ------>     (fetch, merge,       (TanStack Query cache,      WindFarmLegend.tsx
                            transform)           conflict detection,        WindFarmConflictCard.tsx
                                                 GeoJSON conversion)        MobileMap.tsx
                                                                            MapFilterPanel.tsx
                                                                            MPA detail page
```

---

## Data Sources

### EMODnet Human Activities (primary, geometry baseline)

| Property       | Value |
|----------------|-------|
| Endpoint       | `https://ows.emodnet-humanactivities.eu/wfs` |
| Layer          | `emodnet:windfarmspoly` |
| Protocol       | OGC WFS 2.0.0, GeoJSON output |
| Features       | ~600 polygon features |
| Coverage       | 19 European countries (North Sea, Baltic, Atlantic, Mediterranean) |
| Key fields     | `name`, `country`, `status`, `power_mw`, `n_turbines`, `year`, `dist_coast`, `area_sqkm` |
| Auth           | None required |
| Update cadence | Annual |

### OSPAR Offshore Renewables (complement, richer metadata)

| Property       | Value |
|----------------|-------|
| Endpoint       | `https://odims.ospar.org/geoserver/ows` |
| Layer          | `odims:ospar_offshore_renewables_2024_01_001` |
| Protocol       | OGC WFS 2.0.0, GeoJSON output |
| Features       | ~278 features |
| Coverage       | NE Atlantic (OSPAR Convention area) |
| Key fields     | `Name`, `Country`, `Current_St`, `Capacity`, `No_of_Devi`, `Operator`, `Foundation`, `Water_dept`, `EIA`, `Device_Typ`, `Distance_t` |
| License        | CC0 (Public Domain) |
| Auth           | None required |

### Merge Strategy

Both datasets are fetched in parallel. EMODnet serves as the geometry baseline due to wider European coverage. OSPAR records are matched to EMODnet records using a normalized `country::name` key (lowercased, whitespace-collapsed). When a match is found, the EMODnet record is enriched with OSPAR metadata (operator, foundation type, water depth, EIA status, device type). Unmatched OSPAR-only records (e.g., wave or tidal installations not present in EMODnet) are added separately. If OSPAR fails to load, the app falls back to EMODnet-only data with no user-visible error.

**Unit normalization:** EMODnet reports `dist_coast` in meters; OSPAR reports `Distance_t` in kilometers. The service normalizes everything to kilometers.

---

## Files

### New Files

| File | Purpose |
|------|---------|
| `types/wind-farms.ts` | TypeScript type definitions for both EMODnet and OSPAR data, the normalized `WindFarm` interface, conflict types, summary types, and status color/label mappings |
| `lib/wind-farm-service.ts` | Service layer: WFS fetching from both endpoints, data transformation, source merging with deduplication, bounding box conflict detection, GeoJSON conversion, summary computation |
| `hooks/useWindFarmData.ts` | TanStack Query hooks: `useWindFarms`, `useWindFarmLayer`, `useWindFarmConflictsForMPA`, `usePrefetchWindFarms` |
| `components/Map/WindFarmLayer.tsx` | MapLibre `<Source>` + `<Layer>` components rendering wind farm polygons, outlines, and labels, color-coded by development status |
| `components/Map/WindFarmLegend.tsx` | Animated legend showing status colors, farm counts, total capacity, MPA conflict count, and data attribution |
| `components/WindFarmConflictCard.tsx` | MPA detail page card listing wind farms that overlap a given MPA, with status badges, capacity/turbine stats, and OSPAR metadata |

### Modified Files

| File | Change |
|------|--------|
| `components/Map/MapFilterPanel.tsx` | Added `showWindFarms` boolean to `MapFilters` interface and toggle checkbox in the Layers section |
| `components/Map/MobileMap.tsx` | Added `WindFarmLayer` and `WindFarmLegend` rendering, with new props for GeoJSON data and summary |
| `app/(app)/ocean-pulse-app/page.tsx` | Wired `useWindFarmLayer` hook to the main map page, passing GeoJSON and summary to `MobileMap` |
| `app/(app)/ocean-pulse-app/mpa/[id]/page.tsx` | Added "Offshore Wind Farms" collapsible section with conflict detection via `useWindFarmConflictsForMPA` |

---

## Key Types

```typescript
// Normalized wind farm record (merged from EMODnet + OSPAR)
interface WindFarm {
  id: string;
  name: string;
  country: string;
  status: WindFarmStatus;            // 8 possible values
  capacity: number | null;           // MW
  numberOfTurbines: number | null;
  yearCommissioned: number | null;
  developer: string | null;
  geometry: WindFarmGeometry;         // Polygon or MultiPolygon
  centroid: [number, number];         // [lng, lat]
  source: 'emodnet' | 'ospar' | 'merged';
  // OSPAR-enriched fields
  operator: string | null;
  foundation: string | null;          // e.g. "monopile"
  waterDepth: string | null;
  hasEIA: boolean | null;
  distanceToCoast: number | null;     // km
  areaSqKm: number | null;
  deviceType: string | null;          // "wind turbine", "tidal stream", etc.
}

// Spatial overlap between a wind farm and an MPA
interface WindFarmMPAConflict {
  windFarmId: string;
  windFarmName: string;
  windFarmStatus: WindFarmStatus;
  windFarmCapacity: number | null;
  mpaId: string;
  mpaName: string;
  mpaHealthScore: number;
  mpaProtectionLevel: string;
}
```

---

## How It Works

### 1. Data Fetching

`fetchWindFarms()` in `wind-farm-service.ts` fires two parallel WFS requests (EMODnet and OSPAR). Each raw GeoJSON feature is transformed into the normalized `WindFarm` type by `transformEMODnetFeature()` and `transformOSPARFeature()` respectively. Status strings from both sources are normalized to one of 8 canonical values by `normalizeStatus()`, which handles variations like "operational", "commissioned", "consented", and "approved".

### 2. Source Merging

`mergeWindFarmSources()` builds a hash map of OSPAR records keyed by `country::name` (lowercased, whitespace-normalized). It then iterates over EMODnet records and, for each match, produces a merged record with `source: 'merged'` that carries OSPAR metadata (operator, foundation, water depth, EIA, device type). Unmatched OSPAR records are appended at the end.

### 3. Caching

`useWindFarms()` wraps the fetch in TanStack Query with a 24-hour stale time. Wind farm data changes infrequently (annual updates from EMODnet), so aggressive caching is appropriate. The hook also supports an `enabled` flag for lazy loading, meaning data is only fetched when the user activates the wind farm toggle.

### 4. Conflict Detection

`detectConflicts()` computes axis-aligned bounding boxes for every wind farm polygon and every MPA polygon (or falls back to the MPA's `bounds` array). It then tests for bounding box overlap using a simple AABB intersection check. This is a fast approximation suitable for the prototype; a production implementation could use Turf.js for proper polygon intersection.

### 5. Map Rendering

`WindFarmLayer` renders three MapLibre layers within a single GeoJSON source:
- **Fill layer**: Semi-transparent polygons colored by status via a MapLibre `match` expression
- **Line layer**: Polygon outlines with zoom-dependent width (thinner at low zoom, thicker when zoomed in)
- **Symbol layer**: Farm name labels visible at zoom level 8+

The layer sits between the SST layer (below) and MPA boundaries (above) in the rendering order.

### 6. MPA Detail Integration

On each MPA detail page, `useWindFarmConflictsForMPA(mpaId, allMPAs)` filters the global conflict list to those relevant to the current MPA. `WindFarmConflictCard` renders the results: an orange alert banner if conflicts exist, individual cards for each overlapping wind farm (with status badge, capacity, turbine count, and OSPAR metadata), or a green "no conflicts" state.

---

## Status Color Scheme

| Status | Color | Hex |
|--------|-------|-----|
| Production (Operational) | Orange | `#f97316` |
| Under Construction | Yellow | `#eab308` |
| Authorised | Lime | `#84cc16` |
| Pre-Construction | Cyan | `#22d3ee` |
| Planned | Indigo | `#818cf8` |
| Concept/Early Planning | Violet | `#a78bfa` |
| Decommissioned | Gray | `#6b7280` |
| Unknown | Light Gray | `#9ca3af` |

---

## Performance Considerations

- **Lazy loading**: Wind farm data is only fetched when the user enables the toggle (`filters.showWindFarms`). No bandwidth is spent until the user opts in.
- **24-hour cache**: TanStack Query keeps data in memory and avoids re-fetching on navigation. `gcTime` is set to 48 hours.
- **Parallel fetch**: EMODnet and OSPAR requests fire simultaneously via `Promise.all`.
- **Graceful degradation**: If OSPAR fails (network error, timeout, etc.), the catch handler logs a warning and returns an empty array. The app continues with EMODnet-only data.
- **Next.js revalidation**: Both fetch calls use `next: { revalidate: 86400 }` for server-side caching.

---

## Known Limitations and Future Work

1. **Bounding box conflict detection** is an approximation. It may report false positives where bounding boxes overlap but actual polygons do not. A future iteration should use Turf.js `booleanIntersects` for precise polygon intersection.
2. **No click-to-inspect on map**: Currently wind farm polygons are rendered but not interactive on the map itself (no popup on click). The detail is available on MPA detail pages only.
3. **OSPAR matching is name-based**: The merge relies on exact normalized name + country matching. Some records may not match due to naming differences between datasets (e.g., "Horns Rev 1" vs "Horns Rev I"). Fuzzy matching could improve this.
4. **No historical tracking**: The feature shows current state only. Tracking how conflicts evolve over time (new authorizations, decommissioning) would require periodic snapshots.
5. **No filtering by status on map**: All statuses are rendered together. A future enhancement could let users filter the map layer by development status.
