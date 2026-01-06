# Ocean PULSE Production Roadmap

A lean MVP approach to building a production-ready marine conservation platform with full data source integration (Copernicus Marine, MPAtlas, OBIS).

## Target Specifications

| Aspect | Specification |
|--------|---------------|
| User Scale | <50 users (MVP), scalable to 1,000+ |
| Stack | Vercel + Supabase + Railway |
| Authentication | Social login (Google/GitHub) |
| Mobile | PWA (current approach) |
| Data Sources | Copernicus Marine, MPAtlas, OBIS |
| Timeline | 5 weeks |
| Cost | $0/month (free tiers) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Lean MVP Architecture                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         VERCEL (Free)                            │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │  Next.js 15 Frontend                                     │    │    │
│  │  │  - Server Components (SSR)                               │    │    │
│  │  │  - API Routes (lightweight endpoints)                    │    │    │
│  │  │  - Edge Functions (auth middleware)                      │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                            │                                             │
│              ┌─────────────┴─────────────┐                              │
│              ▼                           ▼                              │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │   SUPABASE (Free)   │    │      RAILWAY (Free $5/month)        │    │
│  │                     │    │                                     │    │
│  │  - PostgreSQL       │◀──▶│  Python FastAPI Service             │    │
│  │  - PostGIS          │    │  ├── Copernicus Marine client       │    │
│  │  - Auth (social)    │    │  ├── MPAtlas integration            │    │
│  │  - Row Level Sec.   │    │  ├── OBIS integration               │    │
│  │  - Realtime (opt.)  │    │  └── Health score calculation       │    │
│  │  - Storage (files)  │    │                                     │    │
│  └─────────────────────┘    └─────────────────────────────────────┘    │
│                                           │                             │
│                                           ▼                             │
│                    ┌─────────────────────────────────────────┐          │
│                    │         External Data Sources           │          │
│                    ├─────────────┬───────────┬───────────────┤          │
│                    │ Copernicus  │  MPAtlas  │     OBIS      │          │
│                    │ Marine API  │   API     │     API       │          │
│                    └─────────────┴───────────┴───────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (Vercel)
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| State | TanStack Query |
| Maps | Leaflet + React-Leaflet |
| Auth Client | Supabase Auth Helpers |

### Backend (Railway)
| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python) |
| Data Processing | copernicusmarine, xarray, pandas |
| HTTP Client | httpx (async) |
| Validation | Pydantic |

### Database (Supabase)
| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 15 |
| Geospatial | PostGIS extension |
| Auth | Supabase Auth (Google, GitHub) |
| API | Auto-generated REST + GraphQL |

---

## Project Structure

```
ocean-pulse/
├── apps/
│   ├── web/                      # Next.js Frontend (Vercel)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── callback/
│   │   │   ├── mpa/
│   │   │   │   └── [id]/
│   │   │   ├── api/
│   │   │   │   └── health/       # Simple health check
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts     # Browser client
│   │   │   │   ├── server.ts     # Server client
│   │   │   │   └── middleware.ts
│   │   │   └── api/
│   │   │       └── data-service.ts  # Railway API client
│   │   ├── package.json
│   │   └── vercel.json
│   │
│   └── data-service/             # Python Backend (Railway)
│       ├── app/
│       │   ├── main.py           # FastAPI app
│       │   ├── config.py         # Environment config
│       │   ├── routers/
│       │   │   ├── mpas.py       # MPA endpoints
│       │   │   ├── environmental.py
│       │   │   ├── species.py
│       │   │   └── health.py
│       │   ├── services/
│       │   │   ├── copernicus.py # Copernicus Marine client
│       │   │   ├── mpatlas.py    # MPAtlas client
│       │   │   ├── obis.py       # OBIS client
│       │   │   └── health_score.py
│       │   ├── models/
│       │   │   └── schemas.py    # Pydantic models
│       │   └── db/
│       │       └── supabase.py   # Supabase client
│       ├── requirements.txt
│       ├── Dockerfile
│       └── railway.toml
│
├── supabase/
│   ├── migrations/               # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   └── 002_mpas_table.sql
│   └── seed.sql                  # Initial data
│
└── packages/
    └── shared/                   # Shared TypeScript types
        ├── types/
        └── package.json
```

---

## Phase 1: Foundation (Week 1)

### Objectives
- Set up Supabase project with schema
- Configure authentication
- Create basic API structure

### 1.1 Supabase Project Setup

1. Create project at [supabase.com](https://supabase.com)
2. Enable PostGIS extension
3. Configure auth providers (Google, GitHub)

### 1.2 Database Schema

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- MPAs table (will be populated from MPAtlas)
CREATE TABLE mpas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,  -- MPAtlas ID
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(100),
    geometry GEOMETRY(GEOMETRY, 4326),
    center GEOMETRY(POINT, 4326),
    area_km2 DECIMAL(12, 2),
    established_year INT,
    protection_level VARCHAR(50),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mpas_geometry ON mpas USING GIST(geometry);
CREATE INDEX idx_mpas_center ON mpas USING GIST(center);
CREATE INDEX idx_mpas_country ON mpas(country);

-- Environmental data cache
CREATE TABLE environmental_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    parameter VARCHAR(50) NOT NULL,  -- 'sst', 'chlorophyll', 'oxygen', 'ph'
    value DECIMAL(10, 4),
    unit VARCHAR(20),
    min_value DECIMAL(10, 4),
    max_value DECIMAL(10, 4),
    depth_m DECIMAL(8, 2),
    measured_at TIMESTAMPTZ,
    source VARCHAR(50) DEFAULT 'copernicus',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, parameter, measured_at)
);

CREATE INDEX idx_env_mpa ON environmental_data(mpa_id);
CREATE INDEX idx_env_param ON environmental_data(parameter);

-- Species data cache
CREATE TABLE species_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    scientific_name VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    aphia_id INT,
    observation_count INT,
    trend VARCHAR(20),  -- 'increasing', 'stable', 'decreasing', 'unknown'
    trend_percentage DECIMAL(5, 2),
    last_observed DATE,
    source VARCHAR(50) DEFAULT 'obis',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, scientific_name)
);

CREATE INDEX idx_species_mpa ON species_data(mpa_id);

-- Health scores (calculated)
CREATE TABLE health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    score INT CHECK (score >= 0 AND score <= 100),
    confidence VARCHAR(20),  -- 'high', 'medium', 'low'
    breakdown JSONB,  -- { population: 75, thermal: 80, productivity: 70, ... }
    data_sources JSONB,  -- ['copernicus', 'obis', 'mpatlas']
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, calculated_at)
);

CREATE INDEX idx_health_mpa ON health_scores(mpa_id);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User saved MPAs
CREATE TABLE saved_mpas (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, mpa_id)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_mpas ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Saved MPAs: users can only access their own
CREATE POLICY "Users can view own saved MPAs"
    ON saved_mpas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save MPAs"
    ON saved_mpas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved MPAs"
    ON saved_mpas FOR DELETE USING (auth.uid() = user_id);

-- Public read access for data tables
ALTER TABLE mpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MPAs are viewable by everyone" ON mpas FOR SELECT USING (true);
CREATE POLICY "Environmental data is viewable by everyone" ON environmental_data FOR SELECT USING (true);
CREATE POLICY "Species data is viewable by everyone" ON species_data FOR SELECT USING (true);
CREATE POLICY "Health scores are viewable by everyone" ON health_scores FOR SELECT USING (true);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 1.3 Supabase Client Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

### 1.4 Authentication Setup

```typescript
// app/(auth)/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-8">Sign in to Ocean PULSE</h1>
      <div className="flex flex-col gap-4">
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-white border rounded-lg hover:bg-gray-50"
        >
          Continue with Google
        </button>
        <button
          onClick={signInWithGitHub}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}

// app/(auth)/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

### Phase 1 Deliverables
- [ ] Supabase project created
- [ ] PostGIS extension enabled
- [ ] Database schema deployed
- [ ] Google OAuth configured
- [ ] GitHub OAuth configured
- [ ] Supabase client integrated in Next.js
- [ ] Login/logout flow working
- [ ] Profile auto-creation on signup

---

## Phase 2: Python Data Service (Weeks 2-3)

### Objectives
- Deploy Python service on Railway
- Integrate Copernicus Marine API
- Integrate MPAtlas API
- Integrate OBIS API
- Implement health score calculation

### 2.1 FastAPI Application Structure

```python
# apps/data-service/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import mpas, environmental, species, health
from app.services.mpatlas import MPAtlasService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: sync MPAs from MPAtlas (if needed)
    print("Starting up...")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="Ocean PULSE Data Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(mpas.router, prefix="/api/mpas", tags=["MPAs"])
app.include_router(environmental.router, prefix="/api/environmental", tags=["Environmental"])
app.include_router(species.router, prefix="/api/species", tags=["Species"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ocean-pulse-data"}
```

### 2.2 Configuration

```python
# apps/data-service/app/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # Service role key for backend

    # Copernicus Marine
    COPERNICUS_USERNAME: str
    COPERNICUS_PASSWORD: str

    # Frontend
    FRONTEND_URL: str = "https://ocean-pulse.vercel.app"

    # Cache TTL (seconds)
    CACHE_TTL_ENVIRONMENTAL: int = 3600  # 1 hour
    CACHE_TTL_SPECIES: int = 86400  # 24 hours
    CACHE_TTL_HEALTH: int = 3600  # 1 hour

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2.3 Copernicus Service

```python
# apps/data-service/app/services/copernicus.py

import copernicusmarine
from datetime import datetime, timedelta
from typing import Optional
import numpy as np

class CopernicusService:
    """Client for Copernicus Marine Service data."""

    # Dataset IDs
    DATASETS = {
        'sst': 'cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i',
        'sst_monthly': 'cmems_mod_glo_phy_my_0.083deg_P1M-m',
        'chlorophyll': 'cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D',
        'physics': 'cmems_mod_glo_phy_anfc_0.083deg_PT1H-m',
    }

    async def get_sst_for_bbox(
        self,
        bbox: tuple[float, float, float, float],  # (min_lon, min_lat, max_lon, max_lat)
        days: int = 7
    ) -> dict:
        """Get Sea Surface Temperature for a bounding box."""

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        try:
            ds = copernicusmarine.open_dataset(
                dataset_id=self.DATASETS['sst'],
                variables=['thetao'],
                minimum_longitude=bbox[0],
                maximum_longitude=bbox[2],
                minimum_latitude=bbox[1],
                maximum_latitude=bbox[3],
                start_datetime=start_date.isoformat(),
                end_datetime=end_date.isoformat(),
                minimum_depth=0,
                maximum_depth=10,
            )

            # Calculate statistics
            sst_values = ds['thetao'].values
            sst_values = sst_values[~np.isnan(sst_values)]

            if len(sst_values) == 0:
                return None

            return {
                'parameter': 'sea_surface_temperature',
                'value': round(float(np.mean(sst_values)), 2),
                'min_value': round(float(np.min(sst_values)), 2),
                'max_value': round(float(np.max(sst_values)), 2),
                'unit': '°C',
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'source': 'copernicus'
            }

        except Exception as e:
            print(f"Error fetching SST: {e}")
            return None

    async def get_chlorophyll_for_bbox(
        self,
        bbox: tuple[float, float, float, float],
        days: int = 7
    ) -> dict:
        """Get chlorophyll concentration for a bounding box."""

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        try:
            ds = copernicusmarine.open_dataset(
                dataset_id=self.DATASETS['chlorophyll'],
                variables=['CHL'],
                minimum_longitude=bbox[0],
                maximum_longitude=bbox[2],
                minimum_latitude=bbox[1],
                maximum_latitude=bbox[3],
                start_datetime=start_date.isoformat(),
                end_datetime=end_date.isoformat(),
            )

            chl_values = ds['CHL'].values
            chl_values = chl_values[~np.isnan(chl_values)]

            if len(chl_values) == 0:
                return None

            return {
                'parameter': 'chlorophyll',
                'value': round(float(np.mean(chl_values)), 3),
                'min_value': round(float(np.min(chl_values)), 3),
                'max_value': round(float(np.max(chl_values)), 3),
                'unit': 'mg/m³',
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'source': 'copernicus'
            }

        except Exception as e:
            print(f"Error fetching chlorophyll: {e}")
            return None

    async def get_all_environmental_data(
        self,
        bbox: tuple[float, float, float, float],
        days: int = 7
    ) -> list[dict]:
        """Get all environmental parameters for a bounding box."""

        results = []

        sst = await self.get_sst_for_bbox(bbox, days)
        if sst:
            results.append(sst)

        chl = await self.get_chlorophyll_for_bbox(bbox, days)
        if chl:
            results.append(chl)

        return results
```

### 2.4 MPAtlas Service

```python
# apps/data-service/app/services/mpatlas.py

import httpx
from typing import Optional

MPATLAS_API = "https://mpatlas.org/api/v1"

class MPAtlasService:
    """Client for MPAtlas API."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search_mpas(
        self,
        bbox: Optional[tuple[float, float, float, float]] = None,
        country: Optional[str] = None,
        name: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> dict:
        """Search MPAs from MPAtlas."""

        params = {
            'limit': limit,
            'offset': offset,
            'format': 'json'
        }

        if bbox:
            params['bbox'] = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        if country:
            params['country'] = country
        if name:
            params['name__icontains'] = name

        response = await self.client.get(
            f"{MPATLAS_API}/mpa/",
            params=params
        )
        response.raise_for_status()
        return response.json()

    async def get_mpa_by_id(self, mpa_id: str) -> dict:
        """Get detailed MPA information including geometry."""

        response = await self.client.get(
            f"{MPATLAS_API}/mpa/{mpa_id}/",
            params={'format': 'json'}
        )
        response.raise_for_status()
        return response.json()

    async def get_mpa_geometry(self, mpa_id: str) -> dict:
        """Get MPA boundary geometry as GeoJSON."""

        response = await self.client.get(
            f"{MPATLAS_API}/mpa/{mpa_id}/",
            params={'format': 'geojson'}
        )
        response.raise_for_status()
        return response.json()

    async def sync_mpas_to_database(self, supabase, region: Optional[str] = None):
        """Sync MPAtlas data to Supabase database."""

        offset = 0
        limit = 100

        while True:
            result = await self.search_mpas(limit=limit, offset=offset)
            mpas = result.get('results', [])

            if not mpas:
                break

            for mpa in mpas:
                try:
                    # Get geometry
                    geojson = await self.get_mpa_geometry(mpa['id'])

                    # Upsert to database
                    await supabase.table('mpas').upsert({
                        'external_id': str(mpa['id']),
                        'name': mpa.get('name'),
                        'country': mpa.get('country'),
                        'area_km2': mpa.get('reported_area'),
                        'established_year': mpa.get('established'),
                        'protection_level': mpa.get('protection_level'),
                        'description': mpa.get('description'),
                        'geometry': geojson.get('geometry'),
                        'metadata': mpa
                    }, on_conflict='external_id').execute()

                except Exception as e:
                    print(f"Error syncing MPA {mpa.get('id')}: {e}")
                    continue

            offset += limit

            if len(mpas) < limit:
                break
```

### 2.5 OBIS Service

```python
# apps/data-service/app/services/obis.py

import httpx
from typing import Optional
from datetime import datetime

OBIS_API = "https://api.obis.org/v3"

class OBISService:
    """Client for OBIS (Ocean Biodiversity Information System) API."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)

    async def get_species_for_geometry(
        self,
        geometry_wkt: str,
        year_start: int = 2014,
        year_end: Optional[int] = None
    ) -> list[dict]:
        """Get species occurrences within a geometry."""

        if not year_end:
            year_end = datetime.now().year

        response = await self.client.get(
            f"{OBIS_API}/occurrence",
            params={
                'geometry': geometry_wkt,
                'startdate': f"{year_start}-01-01",
                'enddate': f"{year_end}-12-31",
                'fields': 'species,scientificName,records,year',
                'size': 0,  # Just get aggregations
            }
        )
        response.raise_for_status()
        return response.json()

    async def get_species_checklist(
        self,
        geometry_wkt: str,
    ) -> list[dict]:
        """Get species checklist for an area."""

        response = await self.client.get(
            f"{OBIS_API}/checklist",
            params={
                'geometry': geometry_wkt,
            }
        )
        response.raise_for_status()

        results = response.json().get('results', [])

        return [
            {
                'scientific_name': sp.get('scientificName'),
                'common_name': sp.get('vernacularName'),
                'aphia_id': sp.get('taxonID'),
                'observation_count': sp.get('records', 0),
                'category': sp.get('taxonRank'),
            }
            for sp in results
        ]

    async def get_species_trend(
        self,
        geometry_wkt: str,
        scientific_name: str,
        years: int = 10
    ) -> dict:
        """Calculate population trend for a species."""

        current_year = datetime.now().year
        yearly_counts = []

        for year in range(current_year - years, current_year + 1):
            response = await self.client.get(
                f"{OBIS_API}/occurrence",
                params={
                    'geometry': geometry_wkt,
                    'scientificname': scientific_name,
                    'startdate': f"{year}-01-01",
                    'enddate': f"{year}-12-31",
                    'size': 0,
                }
            )
            data = response.json()
            yearly_counts.append({
                'year': year,
                'count': data.get('total', 0)
            })

        # Calculate trend
        trend = self._calculate_trend(yearly_counts)

        return {
            'scientific_name': scientific_name,
            'yearly_counts': yearly_counts,
            'trend': trend['direction'],
            'trend_percentage': trend['percentage']
        }

    def _calculate_trend(self, counts: list[dict]) -> dict:
        """Calculate trend direction and percentage."""

        if len(counts) < 3:
            return {'direction': 'unknown', 'percentage': 0}

        # Compare first 3 years vs last 3 years
        early = sum(c['count'] for c in counts[:3])
        recent = sum(c['count'] for c in counts[-3:])

        if early == 0:
            if recent > 0:
                return {'direction': 'increasing', 'percentage': 100}
            return {'direction': 'stable', 'percentage': 0}

        change = ((recent - early) / early) * 100

        if change > 20:
            direction = 'increasing'
        elif change < -20:
            direction = 'decreasing'
        else:
            direction = 'stable'

        return {'direction': direction, 'percentage': round(change, 1)}
```

### 2.6 Health Score Calculator

```python
# apps/data-service/app/services/health_score.py

from typing import Optional
from dataclasses import dataclass

@dataclass
class HealthScoreInput:
    # Species data (OBIS)
    species_count: int
    species_trends: list[dict]  # [{'trend': 'increasing|stable|decreasing', ...}]

    # Environmental data (Copernicus)
    sst: Optional[float] = None
    sst_anomaly: Optional[float] = None  # Deviation from baseline
    chlorophyll: Optional[float] = None

    # MPA metadata
    protection_level: Optional[str] = None

class HealthScoreCalculator:
    """
    Calculate composite health score from multiple data sources.

    Weights:
    - Biodiversity (30%): Species count and diversity
    - Population Trends (25%): OBIS species trends
    - Thermal Health (25%): SST and anomalies from Copernicus
    - Productivity (20%): Chlorophyll from Copernicus
    """

    WEIGHTS = {
        'biodiversity': 0.30,
        'population': 0.25,
        'thermal': 0.25,
        'productivity': 0.20,
    }

    def calculate(self, input: HealthScoreInput) -> dict:
        scores = {}
        available_sources = []

        # Biodiversity score (from OBIS species count)
        if input.species_count > 0:
            scores['biodiversity'] = self._biodiversity_score(input.species_count)
            available_sources.append('obis')

        # Population trends score (from OBIS)
        if input.species_trends:
            scores['population'] = self._population_score(input.species_trends)
            if 'obis' not in available_sources:
                available_sources.append('obis')

        # Thermal health score (from Copernicus SST)
        if input.sst is not None:
            scores['thermal'] = self._thermal_score(input.sst, input.sst_anomaly)
            available_sources.append('copernicus')

        # Productivity score (from Copernicus chlorophyll)
        if input.chlorophyll is not None:
            scores['productivity'] = self._productivity_score(input.chlorophyll)
            if 'copernicus' not in available_sources:
                available_sources.append('copernicus')

        # Calculate weighted average (only for available scores)
        if not scores:
            return {
                'score': 0,
                'confidence': 'low',
                'breakdown': {},
                'data_sources': [],
                'message': 'Insufficient data'
            }

        # Normalize weights for available scores
        total_weight = sum(self.WEIGHTS[k] for k in scores.keys())
        normalized_weights = {k: self.WEIGHTS[k] / total_weight for k in scores.keys()}

        composite = sum(scores[k] * normalized_weights[k] for k in scores.keys())

        # Determine confidence
        if len(scores) >= 4:
            confidence = 'high'
        elif len(scores) >= 2:
            confidence = 'medium'
        else:
            confidence = 'low'

        return {
            'score': round(composite),
            'confidence': confidence,
            'breakdown': {k: round(v) for k, v in scores.items()},
            'weights': {k: round(v * 100) for k, v in normalized_weights.items()},
            'data_sources': available_sources
        }

    def _biodiversity_score(self, species_count: int) -> float:
        """Score based on species count. Scale: 0-500+ species."""
        if species_count >= 500:
            return 100
        elif species_count >= 200:
            return 80 + (species_count - 200) / 15
        elif species_count >= 50:
            return 50 + (species_count - 50) / 5
        else:
            return species_count

    def _population_score(self, trends: list[dict]) -> float:
        """Score based on population trends."""
        if not trends:
            return 50

        increasing = sum(1 for t in trends if t.get('trend') == 'increasing')
        stable = sum(1 for t in trends if t.get('trend') == 'stable')
        decreasing = sum(1 for t in trends if t.get('trend') == 'decreasing')

        total = increasing + stable + decreasing
        if total == 0:
            return 50

        # Weighted score: increasing=100, stable=70, decreasing=30
        score = (increasing * 100 + stable * 70 + decreasing * 30) / total
        return score

    def _thermal_score(self, sst: float, anomaly: Optional[float] = None) -> float:
        """Score based on sea surface temperature."""
        # Base score on optimal range (18-28°C for most marine life)
        if 18 <= sst <= 28:
            score = 100
        elif 15 <= sst < 18 or 28 < sst <= 31:
            score = 70
        else:
            score = 40

        # Penalize for anomalies (marine heatwaves)
        if anomaly and abs(anomaly) > 1:
            penalty = min(30, abs(anomaly) * 10)
            score -= penalty

        return max(0, score)

    def _productivity_score(self, chlorophyll: float) -> float:
        """Score based on chlorophyll concentration."""
        # Optimal range: 0.1-3 mg/m³
        if 0.1 <= chlorophyll <= 3:
            return 100
        elif 0.05 <= chlorophyll < 0.1:
            return 70  # Oligotrophic
        elif 3 < chlorophyll <= 10:
            return 70  # Elevated but okay
        elif chlorophyll > 10:
            return 40  # Possible algal bloom
        else:
            return 50
```

### 2.7 API Routers

```python
# apps/data-service/app/routers/environmental.py

from fastapi import APIRouter, HTTPException, Query
from app.services.copernicus import CopernicusService
from app.db.supabase import get_supabase

router = APIRouter()
copernicus = CopernicusService()

@router.get("/{mpa_id}")
async def get_environmental_data(
    mpa_id: str,
    days: int = Query(default=7, ge=1, le=30),
    refresh: bool = Query(default=False)
):
    """Get environmental data for an MPA."""

    supabase = get_supabase()

    # Get MPA bbox from database
    result = supabase.table('mpas').select(
        'id, ST_AsGeoJSON(geometry) as geometry'
    ).eq('id', mpa_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="MPA not found")

    # Check cache first (unless refresh requested)
    if not refresh:
        cached = supabase.table('environmental_data').select('*').eq(
            'mpa_id', mpa_id
        ).gte(
            'created_at', f"now() - interval '{days} days'"
        ).execute()

        if cached.data:
            return {'data': cached.data, 'source': 'cache'}

    # Fetch fresh data from Copernicus
    import json
    geom = json.loads(result.data['geometry'])
    bbox = get_bbox_from_geojson(geom)

    env_data = await copernicus.get_all_environmental_data(bbox, days)

    # Cache results
    for item in env_data:
        supabase.table('environmental_data').upsert({
            'mpa_id': mpa_id,
            'parameter': item['parameter'],
            'value': item['value'],
            'min_value': item.get('min_value'),
            'max_value': item.get('max_value'),
            'unit': item['unit'],
            'source': 'copernicus',
            'measured_at': item['period_end']
        }, on_conflict='mpa_id,parameter,measured_at').execute()

    return {'data': env_data, 'source': 'copernicus'}


def get_bbox_from_geojson(geojson: dict) -> tuple:
    """Extract bounding box from GeoJSON geometry."""
    coords = []

    def extract_coords(obj):
        if isinstance(obj, list):
            if len(obj) >= 2 and isinstance(obj[0], (int, float)):
                coords.append(obj[:2])
            else:
                for item in obj:
                    extract_coords(item)

    extract_coords(geojson.get('coordinates', []))

    if not coords:
        raise ValueError("No coordinates found in geometry")

    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]

    return (min(lons), min(lats), max(lons), max(lats))
```

### 2.8 Railway Deployment

```dockerfile
# apps/data-service/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgeos-dev \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```toml
# apps/data-service/railway.toml

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

```txt
# apps/data-service/requirements.txt

fastapi==0.109.0
uvicorn[standard]==0.27.0
httpx==0.26.0
pydantic==2.5.3
pydantic-settings==2.1.0
copernicusmarine==1.0.0
xarray==2024.1.0
numpy==1.26.3
pandas==2.2.0
supabase==2.3.0
python-dotenv==1.0.0
```

### Phase 2 Deliverables
- [ ] FastAPI application structure
- [ ] Copernicus Marine integration
- [ ] MPAtlas integration
- [ ] OBIS integration
- [ ] Health score calculator
- [ ] API endpoints working
- [ ] Railway deployment configured
- [ ] Environment variables set
- [ ] Database caching implemented

---

## Phase 3: Frontend Integration (Week 4)

### Objectives
- Connect frontend to Python data service
- Update components to use real data
- Implement user features

### 3.1 Data Service Client

```typescript
// lib/api/data-service.ts

const DATA_SERVICE_URL = process.env.NEXT_PUBLIC_DATA_SERVICE_URL;

class DataServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = DATA_SERVICE_URL || 'http://localhost:8000';
  }

  async getEnvironmentalData(mpaId: string, days = 7) {
    const res = await fetch(
      `${this.baseUrl}/api/environmental/${mpaId}?days=${days}`
    );
    if (!res.ok) throw new Error('Failed to fetch environmental data');
    return res.json();
  }

  async getSpeciesData(mpaId: string) {
    const res = await fetch(`${this.baseUrl}/api/species/${mpaId}`);
    if (!res.ok) throw new Error('Failed to fetch species data');
    return res.json();
  }

  async getHealthScore(mpaId: string, refresh = false) {
    const res = await fetch(
      `${this.baseUrl}/api/health/${mpaId}?refresh=${refresh}`
    );
    if (!res.ok) throw new Error('Failed to fetch health score');
    return res.json();
  }

  async searchMPAs(params: {
    query?: string;
    country?: string;
    bbox?: string;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('q', params.query);
    if (params.country) searchParams.set('country', params.country);
    if (params.bbox) searchParams.set('bbox', params.bbox);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const res = await fetch(
      `${this.baseUrl}/api/mpas?${searchParams.toString()}`
    );
    if (!res.ok) throw new Error('Failed to search MPAs');
    return res.json();
  }
}

export const dataService = new DataServiceClient();
```

### 3.2 TanStack Query Setup

```typescript
// lib/query-client.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// hooks/useEnvironmentalData.ts
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/lib/api/data-service';

export function useEnvironmentalData(mpaId: string, days = 7) {
  return useQuery({
    queryKey: ['environmental', mpaId, days],
    queryFn: () => dataService.getEnvironmentalData(mpaId, days),
    enabled: !!mpaId,
  });
}

// hooks/useHealthScore.ts
export function useHealthScore(mpaId: string) {
  return useQuery({
    queryKey: ['health-score', mpaId],
    queryFn: () => dataService.getHealthScore(mpaId),
    enabled: !!mpaId,
  });
}
```

### 3.3 Updated MPA Page

```typescript
// app/mpa/[id]/page.tsx (key changes)

'use client';

import { useEnvironmentalData } from '@/hooks/useEnvironmentalData';
import { useHealthScore } from '@/hooks/useHealthScore';
import { EnvironmentalDashboard } from '@/components/EnvironmentalDashboard';
import { HealthScoreCard } from '@/components/HealthScoreCard';

export default function MPADetailPage({ params }: { params: { id: string } }) {
  const { data: envData, isLoading: envLoading } = useEnvironmentalData(params.id);
  const { data: healthData, isLoading: healthLoading } = useHealthScore(params.id);

  return (
    <main>
      {/* Health Score from backend */}
      <HealthScoreCard
        score={healthData?.score}
        breakdown={healthData?.breakdown}
        confidence={healthData?.confidence}
        loading={healthLoading}
      />

      {/* Environmental data from Copernicus */}
      <EnvironmentalDashboard
        data={envData?.data}
        loading={envLoading}
        source={envData?.source}
      />

      {/* ... rest of page */}
    </main>
  );
}
```

### 3.4 User Features with Supabase

```typescript
// hooks/useSavedMPAs.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useSavedMPAs() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: savedMPAs, isLoading } = useQuery({
    queryKey: ['saved-mpas'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('saved_mpas')
        .select('mpa_id, saved_at, mpas(*)')
        .eq('user_id', user.id);

      return data || [];
    },
  });

  const saveMPA = useMutation({
    mutationFn: async (mpaId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_mpas')
        .insert({ user_id: user.id, mpa_id: mpaId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-mpas'] });
    },
  });

  const unsaveMPA = useMutation({
    mutationFn: async (mpaId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_mpas')
        .delete()
        .eq('user_id', user.id)
        .eq('mpa_id', mpaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-mpas'] });
    },
  });

  const isSaved = (mpaId: string) =>
    savedMPAs?.some((s) => s.mpa_id === mpaId) || false;

  return {
    savedMPAs,
    isLoading,
    saveMPA,
    unsaveMPA,
    isSaved,
  };
}
```

### Phase 3 Deliverables
- [ ] Data service client created
- [ ] TanStack Query configured
- [ ] Environmental dashboard using Copernicus data
- [ ] Health score using backend calculation
- [ ] User saved MPAs feature
- [ ] Loading states and error handling
- [ ] Remove old client-side API calls

---

## Phase 4: Polish & Deploy (Week 5)

### Objectives
- Production deployment
- Performance optimization
- Error monitoring
- Documentation

### 4.1 Environment Variables

```bash
# Vercel (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_DATA_SERVICE_URL=https://ocean-pulse-data.up.railway.app

# Railway (Data Service)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service role key
COPERNICUS_USERNAME=your_username
COPERNICUS_PASSWORD=your_password
FRONTEND_URL=https://ocean-pulse.vercel.app
```

### 4.2 Vercel Deployment

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "NEXT_PUBLIC_DATA_SERVICE_URL": "@data-service-url"
  }
}
```

### 4.3 Error Monitoring (Sentry - Free Tier)

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 4.4 Final Checklist

**Security**
- [ ] Environment variables secured
- [ ] Supabase RLS policies tested
- [ ] CORS configured correctly
- [ ] API rate limiting (Railway has built-in)

**Performance**
- [ ] TanStack Query caching optimized
- [ ] Images optimized (next/image)
- [ ] Bundle size checked
- [ ] Lighthouse score >80

**Monitoring**
- [ ] Sentry error tracking
- [ ] Supabase dashboard monitoring
- [ ] Railway logs accessible

**Documentation**
- [ ] README updated
- [ ] Environment setup guide
- [ ] API documentation

### Phase 4 Deliverables
- [ ] Vercel production deployment
- [ ] Railway production deployment
- [ ] Custom domain configured
- [ ] Error monitoring active
- [ ] Performance optimized
- [ ] Documentation complete

---

## Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel | Hobby | $0 |
| Supabase | Free | $0 |
| Railway | Free ($5 credit) | $0 |
| Sentry | Free (5K errors) | $0 |
| Domain | .com | ~$1 (annual/12) |
| **Total** | | **~$1/month** |

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Supabase + Auth |
| 2-3 | Data Service | Python backend + integrations |
| 4 | Frontend | Connect to backend + user features |
| 5 | Polish | Deploy + monitor + document |

**Total: 5 weeks**

---

## Future Enhancements (Post-MVP)

When you need to scale:

| Trigger | Enhancement |
|---------|-------------|
| >100 users | Add Redis caching (Upstash free tier) |
| >1000 users | Migrate to AWS/GCP |
| Need forecasts | Add Copernicus forecast endpoints |
| Mobile apps | React Native or Expo |
| Team features | Add organizations, roles |

---

## Quick Start Commands

```bash
# 1. Clone and install
git clone https://github.com/your-repo/ocean-pulse
cd ocean-pulse
npm install

# 2. Set up Supabase
npx supabase init
npx supabase db push

# 3. Start frontend
npm run dev

# 4. Start data service (in apps/data-service)
cd apps/data-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 5. Deploy
vercel deploy --prod  # Frontend
railway up            # Data service
```
