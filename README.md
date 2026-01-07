# Ocean PULSE

Real-time Marine Protected Area (MPA) health monitoring and species tracking platform.

## Features

- **MPA Explorer**: Browse and search Marine Protected Areas worldwide
- **Health Scores**: Real-time health assessments using Copernicus satellite data and OBIS biodiversity data
- **Species Tracking**: View indicator species and population trends
- **Satellite Telemetry**: Animal tracking data from Movebank
- **Environmental Monitoring**: Sea surface temperature, chlorophyll, oxygen, pH, and salinity data
- **Offline Support**: PWA with offline caching for field use
- **User Accounts**: Save favorite MPAs with Supabase authentication

## Tech Stack

### Frontend (Vercel)
- Next.js 16 (App Router)
- React 19
- TailwindCSS
- TanStack Query
- Leaflet Maps
- Framer Motion

### Backend (Render)
- Python FastAPI
- Copernicus Marine API (satellite data)
- OBIS API (biodiversity data)

### Infrastructure
- **Vercel**: Frontend hosting
- **Render**: Python backend
- **Supabase**: Authentication & database
- **Sentry**: Error monitoring

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Copernicus Marine account

### Frontend Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your values:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_DATA_SERVICE_URL

# Run development server
npm run dev
```

### Backend Setup

```bash
cd apps/data-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your values:
# - COPERNICUS_USERNAME
# - COPERNICUS_PASSWORD

# Run development server
uvicorn app.main:app --reload
```

## Environment Variables

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_DATA_SERVICE_URL` | Backend API URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `COPERNICUS_USERNAME` | Copernicus Marine username |
| `COPERNICUS_PASSWORD` | Copernicus Marine password |
| `DEBUG` | Enable debug mode |

## Deployment

### Frontend (Vercel)

1. Connect your GitLab repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Backend (Render)

1. Connect your GitLab repo to Render
2. Set root directory to `apps/data-service`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables
6. Deploy

## API Endpoints

### Health Score
```
GET /api/v1/health/{mpa_id}?name=...&lat=...&lon=...
```

### Environmental Data
```
GET /api/v1/environmental/{mpa_id}?lat=...&lon=...
```

### Species Data
```
GET /api/v1/species/{mpa_id}?lat=...&lon=...&radius_km=50
```

## Data Sources

- **Copernicus Marine Service**: Satellite-derived environmental data
- **OBIS**: Ocean Biodiversity Information System
- **Movebank**: Animal tracking database
- **MPAtlas**: Marine Protected Area boundaries

## Project Structure

```
ocean-pulse/
├── app/                    # Next.js pages
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and services
├── types/                  # TypeScript types
├── apps/
│   └── data-service/       # Python FastAPI backend
│       ├── app/
│       │   ├── routers/    # API endpoints
│       │   ├── services/   # Business logic
│       │   └── models/     # Pydantic models
│       └── requirements.txt
└── docs/                   # Documentation
```

## License

MIT
