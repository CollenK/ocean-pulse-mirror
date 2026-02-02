# Server-Side Data Pipeline Plan

## Problem

The app currently fetches OBIS and Movebank data client-side on every MPA detail page visit (cache miss). This means:

- ~20 external API requests per MPA visit, taking 15-20 seconds
- Every user independently fetches identical data
- First-time visitors see spinners while data loads
- OBIS outages directly affect the user experience
- Client-side rate limiting slows the experience further

The data itself (marine occurrence records, environmental measurements) changes slowly, on the scale of weeks or months. There is no reason to fetch it reactively from the browser.

## Current State

### What Already Exists

The infrastructure for server-side data is partially in place:

**Supabase tables** (already created in migrations):
- `species_data` - species per MPA with trend + observation count
- `environmental_data` - environmental parameters per MPA with values
- `health_scores` - calculated composite scores with breakdown
- `mpas` - all 100 MPAs with PostGIS geometry and center points

**Python backend** (`apps/data-service/`):
- FastAPI service deployed on Railway
- Already fetches Copernicus environmental data and OBIS species data
- Has endpoints for health scores, environmental data, species lists
- In-memory caching with TTL (1h environmental, 24h species)

**What's missing**:
- No scheduled job to pre-populate data for all MPAs
- No Supabase tables for population trends (abundance time series)
- No Supabase tables for tracking data
- The frontend doesn't read from these Supabase tables for abundance/tracking
- The Python backend doesn't fetch abundance trend data or Movebank tracking data
- MPA polygon geometry is stored in PostGIS but never populated with real data; the frontend renders approximate rectangles from center points instead of actual boundaries

## Proposed Architecture

```
                    Scheduled (daily)          One-time / monthly
                         |                           |
                         v                           v
              +---------------------+    +----------------------+
              |  Python Data Service |    | Protected Planet API |
              |  (FastAPI on Railway)|    | (WDPA polygons)      |
              +---------------------+    +----------------------+
              |                     |              |
              v                     v              v
     +--------+-------+    +-------+--------+     |
     | OBIS API       |    | Movebank API   |     |
     | - occurrences   |    | - studies      |     |
     | - environmental |    | - events       |     |
     | - checklists    |    | - individuals  |     |
     +----------------+    +----------------+     |
              |                     |              |
              v                     v              v
              +------------------------------------+
              |       Process & Aggregate          |
              |  - trends, health scores, anomalies|
              |  - polygon geometry                |
              +------------------------------------+
                         |
                         v
              +---------------------+
              |     Supabase        |
              |  (PostgreSQL +      |
              |   PostGIS)          |
              +---------------------+
                         |
                         v
              +---------------------+
              |  Next.js Frontend   |
              |  (reads from        |
              |   Supabase only)    |
              +---------------------+
```

## Implementation Steps

### Phase 1: New Supabase Tables

Create a new migration (`004_data_pipeline_tables.sql`) with tables for the data currently fetched client-side.

#### `population_trends` table

Stores per-species abundance trend data for each MPA. Replaces client-side OBIS abundance fetching.

```sql
CREATE TABLE population_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpa_id UUID NOT NULL REFERENCES mpas(id) ON DELETE CASCADE,
  scientific_name VARCHAR(255) NOT NULL,
  common_name VARCHAR(255),

  -- Trend analysis
  trend VARCHAR(20) NOT NULL DEFAULT 'insufficient_data',
    -- 'increasing', 'stable', 'decreasing', 'insufficient_data'
  change_percent DECIMAL(8,2) DEFAULT 0,
  confidence VARCHAR(10) NOT NULL DEFAULT 'low',
    -- 'high', 'medium', 'low'

  -- Raw data summary
  record_count INT NOT NULL DEFAULT 0,
  data_point_count INT NOT NULL DEFAULT 0, -- monthly aggregated points
  date_range_start DATE,
  date_range_end DATE,

  -- Monthly time series (JSONB array of {date, count, recordCount})
  monthly_data JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  source VARCHAR(50) DEFAULT 'obis',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(mpa_id, scientific_name)
);

CREATE INDEX idx_population_trends_mpa ON population_trends(mpa_id);
CREATE INDEX idx_population_trends_fetched ON population_trends(fetched_at);
```

#### `mpa_abundance_summaries` table

Stores the aggregated abundance summary per MPA (overall health score, species count, trend direction). This is what the frontend reads directly.

```sql
CREATE TABLE mpa_abundance_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpa_id UUID NOT NULL REFERENCES mpas(id) ON DELETE CASCADE UNIQUE,

  -- Overall metrics
  species_count INT NOT NULL DEFAULT 0,
  trend_direction VARCHAR(20) NOT NULL DEFAULT 'stable',
  health_score INT NOT NULL DEFAULT 0,

  -- Data quality
  total_records INT NOT NULL DEFAULT 0,

  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_abundance_summaries_mpa ON mpa_abundance_summaries(mpa_id);
```

#### `tracking_summaries` table

Stores Movebank/OBIS tracking data summaries per MPA.

```sql
CREATE TABLE tracking_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpa_id UUID NOT NULL REFERENCES mpas(id) ON DELETE CASCADE UNIQUE,

  -- Summary stats
  tracked_species INT NOT NULL DEFAULT 0,
  tracked_individuals INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,

  -- Species list with tracking info (JSONB array)
  species_tracks JSONB DEFAULT '[]'::jsonb,

  -- Heatmap data (JSONB array of {lat, lng, weight})
  heatmap_points JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  source VARCHAR(50) DEFAULT 'movebank',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_summaries_mpa ON tracking_summaries(mpa_id);
```

#### RLS Policies

```sql
-- Public read access (same as existing data tables)
ALTER TABLE population_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpa_abundance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON population_trends FOR SELECT USING (true);
CREATE POLICY "Public read" ON mpa_abundance_summaries FOR SELECT USING (true);
CREATE POLICY "Public read" ON tracking_summaries FOR SELECT USING (true);

-- Service role write access (for the pipeline)
CREATE POLICY "Service write" ON population_trends FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON mpa_abundance_summaries FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON tracking_summaries FOR ALL
  USING (auth.role() = 'service_role');
```

### Phase 2: Pipeline Worker in Python Backend

Add a new module to the FastAPI data service that runs the data pipeline.

#### File structure

```
apps/data-service/
  app/
    main.py              # Existing FastAPI app
    routers/
      health.py          # Existing health endpoints
      pipeline.py        # NEW: pipeline trigger endpoint
    services/
      copernicus.py      # Existing
      obis.py            # Existing
      obis_abundance.py  # NEW: port abundance logic from TS
      movebank.py        # NEW: port tracking logic from TS
      pipeline.py        # NEW: orchestrates full pipeline run
    models/
      ...
```

#### Pipeline orchestration (`services/pipeline.py`)

The pipeline iterates over all MPAs and refreshes their data:

```
async def run_pipeline():
    mpas = await fetch_all_mpas_from_supabase()

    for mpa in mpas:
        # 1. Determine ecosystem type and indicator species
        ecosystems = determine_ecosystem_types(mpa)
        indicator_species = get_indicator_species_for_ecosystems(ecosystems, mpa)

        # 2. Fetch OBIS abundance data per indicator species
        search_radius = min(max(sqrt(mpa.area / pi), 50), 300)
        abundance_records = await fetch_obis_abundance(mpa, indicator_species, search_radius)

        # 3. Process trends and calculate health score
        trends = process_species_trends(abundance_records)
        summary = calculate_overall_biodiversity(trends)

        # 4. Write to Supabase (upsert)
        await upsert_population_trends(mpa.id, trends)
        await upsert_abundance_summary(mpa.id, summary)

        # 5. Fetch Movebank tracking data
        tracking = await fetch_movebank_tracking(mpa, indicator_species)
        await upsert_tracking_summary(mpa.id, tracking)

        # 6. Refresh health score (combines all data sources)
        await refresh_health_score(mpa)

        # Rate limit between MPAs
        await asyncio.sleep(2)
```

Key design decisions:

- **Upsert pattern**: Use `ON CONFLICT (mpa_id, scientific_name) DO UPDATE` for population_trends, and `ON CONFLICT (mpa_id) DO UPDATE` for summaries. This makes the pipeline idempotent.
- **Error isolation**: Each MPA is processed independently. If one fails, log the error and continue to the next.
- **Rate limiting**: 2-second pause between MPAs, plus per-request delays for OBIS (1s) and Movebank (3s).
- **Search radius**: Scaled to MPA area (same formula as the current frontend fix).

#### Pipeline trigger endpoint (`routers/pipeline.py`)

```python
@router.post("/api/v1/pipeline/run")
async def trigger_pipeline(background_tasks: BackgroundTasks, api_key: str = Header(...)):
    """Trigger a full data pipeline run. Protected by API key."""
    if api_key != settings.PIPELINE_API_KEY:
        raise HTTPException(401, "Invalid API key")
    background_tasks.add_task(run_pipeline)
    return {"status": "started"}

@router.get("/api/v1/pipeline/status")
async def pipeline_status():
    """Check pipeline status and last run time."""
    return {
        "last_run": last_run_timestamp,
        "mpas_processed": mpas_processed_count,
        "status": current_status,
    }
```

### Phase 3: Scheduling

There are three options for scheduling. Choose based on deployment platform.

#### Option A: Railway Cron (recommended if staying on Railway)

Railway supports cron jobs. Add a separate service or use the existing one with a cron trigger:

```toml
# railway.toml
[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"

[[crons]]
schedule = "0 3 * * *"  # Daily at 3 AM UTC
command = "python -m app.pipeline_runner"
```

Create `app/pipeline_runner.py`:
```python
import asyncio
from app.services.pipeline import run_pipeline

if __name__ == "__main__":
    asyncio.run(run_pipeline())
```

#### Option B: Supabase pg_cron + Edge Function

Use pg_cron to trigger a Supabase Edge Function that calls the pipeline endpoint:

```sql
SELECT cron.schedule(
  'refresh-mpa-data',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := 'https://your-railway-service.up.railway.app/api/v1/pipeline/run',
    headers := '{"api-key": "your-secret-key"}'::jsonb
  )$$
);
```

#### Option C: Vercel Cron (if moving backend to Vercel)

Add a Next.js API route with Vercel cron:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/pipeline/trigger",
    "schedule": "0 3 * * *"
  }]
}
```

#### Recommended schedule

- **Daily at 3 AM UTC**: Full pipeline run for all 100 MPAs
- Estimated duration: 100 MPAs x ~30 seconds each = ~50 minutes
- OBIS data changes slowly, so daily is more than sufficient

### Phase 4: Frontend Changes

Modify the frontend to read from Supabase instead of calling OBIS/Movebank directly.

#### New service functions (`lib/mpa-data-service.ts`)

```typescript
import { createClient } from '@/lib/supabase/client';

export async function getAbundanceSummary(mpaId: string) {
  const supabase = createClient();

  // Get the summary
  const { data: summary } = await supabase
    .from('mpa_abundance_summaries')
    .select('*')
    .eq('mpa_id', mpaId)
    .single();

  if (!summary) return null;

  // Get the individual species trends
  const { data: trends } = await supabase
    .from('population_trends')
    .select('*')
    .eq('mpa_id', mpaId)
    .order('confidence', { ascending: false });

  return {
    mpaId: summary.mpa_id,
    speciesTrends: (trends || []).map(t => ({
      speciesName: t.common_name || t.scientific_name,
      scientificName: t.scientific_name,
      dataPoints: t.monthly_data || [],
      trend: t.trend,
      changePercent: t.change_percent,
      confidence: t.confidence,
    })),
    overallBiodiversity: {
      speciesCount: summary.species_count,
      trendDirection: summary.trend_direction,
      healthScore: summary.health_score,
    },
    dataQuality: {
      recordsWithAbundance: summary.total_records,
      totalRecords: summary.total_records,
      coveragePercent: 100,
    },
    lastUpdated: new Date(summary.fetched_at).getTime(),
  };
}

export async function getTrackingSummary(mpaId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('tracking_summaries')
    .select('*')
    .eq('mpa_id', mpaId)
    .single();
  return data;
}
```

#### Updated hooks

Replace `useAbundanceData` to read from Supabase using TanStack Query:

```typescript
export function useAbundanceData(mpaId: string) {
  return useQuery({
    queryKey: ['abundance', mpaId],
    queryFn: () => getAbundanceSummary(mpaId),
    enabled: !!mpaId,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}
```

This gives:
- Instant data (Supabase query, not OBIS)
- TanStack Query handles caching, deduplication, and background refetch
- No IndexedDB cache management needed (TanStack Query handles it)
- Offline support via TanStack Query's `persister` or fallback to IndexedDB

#### What to remove

Once the pipeline is running and frontend reads from Supabase:

- `lib/obis-abundance.ts` - client-side OBIS fetching (entire file)
- `lib/obis-environmental.ts` - client-side environmental fetching
- `lib/obis-tracking.ts` - client-side tracking fetching
- `lib/movebank.ts` - client-side Movebank fetching
- `hooks/useAbundanceData.ts` - replace with Supabase query hook
- `hooks/useEnvironmentalData.ts` - replace with Supabase query hook
- `hooks/useTrackingData.ts` - replace with Supabase query hook
- IndexedDB stores: `abundance-cache`, `environmental-cache`, `tracking-cache`

Keep the existing hooks as a fallback during the transition period. The frontend can check if Supabase has data and fall back to client-side fetching if the pipeline hasn't run yet.

### Phase 5: Monitoring

Add basic observability to the pipeline:

1. **Pipeline status table** in Supabase:
   ```sql
   CREATE TABLE pipeline_runs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     started_at TIMESTAMPTZ NOT NULL,
     completed_at TIMESTAMPTZ,
     status VARCHAR(20) NOT NULL DEFAULT 'running',
     mpas_total INT,
     mpas_completed INT DEFAULT 0,
     mpas_failed INT DEFAULT 0,
     errors JSONB DEFAULT '[]'::jsonb
   );
   ```

2. **Sentry integration** in the pipeline worker for error alerting.

3. **Data freshness check**: The frontend can display when data was last updated using `fetched_at` from the summary tables. If data is older than 48 hours, show a subtle indicator.

### Phase 6: MPA Polygon Geometry (Protected Planet)

The app currently renders approximate rectangles for MPA boundaries because the `geometry` column in the `mpas` table was never populated with real polygon data. Protected Planet (WDPA) provides actual MPA boundary polygons via their API.

#### Data source

**Protected Planet API v4** (`https://api.protectedplanet.net/v4`)

- Endpoint: `GET /v4/protected_areas/{wdpa_id}?with_geometry=true`
- Auth: API token via `token` query parameter
- Rate limit: Unknown (be conservative, 1 request per second)
- Returns: GeoJSON polygon geometry in the response body
- Requires: `PROTECTED_PLANET_API_TOKEN` environment variable

The app already stores WDPA IDs in `mpas.external_id`, so we can look up each MPA directly.

#### Pipeline module (`services/protected_planet.py`)

```python
import httpx
from shapely.geometry import shape
from shapely import wkt

PP_API_BASE = "https://api.protectedplanet.net/v4"

async def fetch_mpa_polygon(wdpa_id: str, api_token: str) -> str | None:
    """Fetch polygon geometry for an MPA from Protected Planet.
    Returns WKT string for PostGIS storage, or None if unavailable."""
    url = f"{PP_API_BASE}/protected_areas/{wdpa_id}"
    params = {"token": api_token, "with_geometry": "true"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        return None

    data = response.json()
    geojson = data.get("protected_area", {}).get("geojson", {}).get("geometry")

    if not geojson:
        return None

    # Convert GeoJSON to WKT for PostGIS
    geom = shape(geojson)

    # Simplify very complex polygons to keep storage reasonable
    # Tolerance of ~100m at the equator
    if geom.is_valid and len(geom.wkt) > 50000:
        geom = geom.simplify(0.001, preserve_topology=True)

    return geom.wkt


async def update_mpa_geometry(supabase, mpa_db_id: str, wkt_geometry: str):
    """Update the geometry column for an MPA in Supabase."""
    await supabase.rpc("update_mpa_geometry", {
        "mpa_uuid": mpa_db_id,
        "geom_wkt": wkt_geometry,
    }).execute()
```

#### Supabase RPC function

Create a server-side function to handle the PostGIS conversion safely:

```sql
-- In the pipeline migration (004_data_pipeline_tables.sql)
CREATE OR REPLACE FUNCTION update_mpa_geometry(mpa_uuid UUID, geom_wkt TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE mpas
  SET geometry = ST_GeomFromText(geom_wkt, 4326),
      updated_at = now()
  WHERE id = mpa_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Pipeline integration

Add polygon fetching to the main pipeline, but run it less frequently since MPA boundaries rarely change:

```python
async def run_polygon_refresh():
    """Fetch polygon geometry for MPAs that don't have it yet."""
    mpas = await fetch_all_mpas_from_supabase()
    api_token = settings.PROTECTED_PLANET_API_TOKEN

    for mpa in mpas:
        if not mpa.external_id:
            continue

        # Check if geometry is already populated (skip if so)
        if mpa.has_real_geometry:
            continue

        wkt_geom = await fetch_mpa_polygon(mpa.external_id, api_token)
        if wkt_geom:
            await update_mpa_geometry(supabase, mpa.db_id, wkt_geom)

        # Rate limit: 1 request per second
        await asyncio.sleep(1)
```

This should be triggered:
- **Once** on initial setup (to backfill all 100 MPAs)
- **Monthly** thereafter (to pick up any boundary changes or new MPAs)
- Via a separate pipeline endpoint: `POST /api/v1/pipeline/refresh-polygons`

#### Frontend changes

Once polygons are in the database, the frontend needs three changes:

**1. Update `MPA` type** (`types/index.ts`):

Add an optional `polygon` field to carry the actual geometry coordinates:

```typescript
export interface MPA {
  // ... existing fields ...
  bounds: number[][];                    // Keep for backward compat
  polygon?: number[][][];               // Actual polygon coordinates [[lng, lat], ...]
}
```

**2. Update `transformMPARow`** (`lib/mpa-service.ts`):

Extract real polygon coordinates from the PostGIS geometry instead of generating fake rectangles:

```typescript
// Parse polygon from geometry if available
let polygon: number[][][] | undefined;
if (row.geometry) {
  if (row.geometry.coordinates) {
    // GeoJSON format from Supabase (when using .select('geometry::json'))
    polygon = row.geometry.coordinates;
  }
}

// Still compute bounds for backward compat and quick spatial checks
let bounds: number[][] = [];
if (polygon && polygon[0]) {
  const coords = polygon[0];
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);
  bounds = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
} else {
  // Fallback: approximate from center
  const [lat, lon] = center;
  const delta = 0.5;
  bounds = [[lat - delta, lon - delta], [lat + delta, lon + delta]];
}
```

**3. Update map rendering** (`components/Map/MobileMap.tsx`):

Use real polygons when available, fall back to `boundsToGeoJSON` rectangles otherwise:

```typescript
const boundariesGeoJSON = useMemo(() => ({
  type: 'FeatureCollection' as const,
  features: mpas
    .filter((mpa) => mpa.polygon || (mpa.bounds && mpa.bounds.length === 2))
    .map((mpa) => ({
      type: 'Feature' as const,
      properties: {
        id: mpa.id,
        color: getHealthColor(mpa.healthScore),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: mpa.polygon || [boundsToGeoJSON(mpa.bounds)],
      },
    })),
}), [mpas]);
```

No changes needed to the MapLibre layer definitions since they already render generic polygons.

#### Supabase query change

To get polygon data as GeoJSON from PostGIS, update the MPA query to cast geometry:

```typescript
const { data } = await supabase
  .from('mpas')
  .select('*, geometry::json')  // Cast PostGIS to GeoJSON
  .order('name');
```

This returns the geometry column as a GeoJSON object instead of WKT/WKB.

#### Environment variable

```bash
PROTECTED_PLANET_API_TOKEN=   # Protected Planet API v4 token
```

## Estimated Timeline

| Phase | Scope | Depends On |
|-------|-------|------------|
| Phase 1 | Supabase migration | Nothing |
| Phase 2 | Python pipeline worker | Phase 1 |
| Phase 3 | Scheduling setup | Phase 2 |
| Phase 4 | Frontend migration | Phase 2 (can start once pipeline produces data) |
| Phase 5 | Monitoring | Phase 2 |
| Phase 6 | MPA polygon geometry | Protected Planet API key |

Phases 1 and 2 are the core work. Phases 3-5 can be done incrementally. Phase 6 is independent and can be implemented as soon as the Protected Planet API key is available.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OBIS API downtime during pipeline run | Some MPAs get stale data | Pipeline retries failed MPAs; existing data persists |
| Pipeline takes too long (100 MPAs) | Overlapping runs | Track run status; skip if previous run still active |
| Movebank rate limiting | Tracking data missing | Aggressive backoff; Movebank data is supplementary |
| Supabase storage growth | Costs increase | monthly_data JSONB is compact; monitor row counts |
| Pipeline API key leaked | Unauthorized runs | Rotate keys; add IP allowlisting on Railway |
| Protected Planet API rate limits | Polygon fetch fails for some MPAs | Run infrequently (monthly); retry failed MPAs next run |
| Complex polygons too large | Supabase storage/query performance | Simplify with ST_Simplify or Shapely (0.001 tolerance); cap at ~50KB per polygon |

## Migration Strategy

1. Deploy pipeline and let it run for a few days alongside the current client-side approach
2. Verify data quality by comparing pipeline results with client-side results for several MPAs
3. Switch frontend to read from Supabase with a feature flag
4. Monitor for a week
5. Remove client-side OBIS/Movebank fetching code
