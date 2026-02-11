# Copernicus Marine Service - Detailed Implementation Plan

**Created:** 2026-02-11
**Status:** Planning
**Priority:** High - Transforms static data into living dashboard

---

## Executive Summary

This plan details how to integrate Copernicus Marine Service data into Ocean PULSE to transform the app from showing historical snapshots to providing real-time, forecast-enabled ocean health monitoring.

### Current State

We already have:
- **FastAPI backend** at `apps/data-service/` deployed on Railway
- **Copernicus service** (`app/services/copernicus.py`) with basic SST and BGC fetching
- **Health score calculation** that includes thermal stress component
- **Frontend integration** via `lib/api/data-service.ts`
- **WMS endpoints** working for SST visualization (no auth required)

### Target State

- Real-time SST with marine heatwave alerts
- 10-day forecast widget on MPA detail pages
- Chlorophyll monitoring for algal bloom detection
- Continuous gridded coverage replacing sparse point observations
- Significant improvement to Health Score reliability

---

## Data Products Priority Matrix

| Product | User Value | Effort | Priority | Phase |
|---------|-----------|--------|----------|-------|
| SST + Heatwave Alerts | Very High | Low | **P0** | 1 |
| SST Map Overlay | High | Very Low | **P0** | 1 |
| Chlorophyll + Bloom Alerts | High | Medium | **P1** | 2 |
| Enhanced Health Score | Very High | Medium | **P1** | 2 |
| 10-Day Forecast Widget | High | Medium | **P2** | 3 |
| Ocean Currents Layer | Medium | Medium | **P3** | 4 |
| Sea Level + Wave Data | Medium | High | **P4** | 4 |
| Multi-Year Trends | Medium | High | **P4** | 4 |

---

## Phase 1: SST & Marine Heatwave Alerts (P0)

**Goal:** Give users immediate, actionable information about thermal stress in MPAs
**Timeline:** 1-2 weeks
**User Impact:** High - "weather app for the ocean" experience

### 1.1 SST Map Overlay (Frontend)

**What:** Add toggleable SST layer to MPA maps using Copernicus WMTS tiles
**Effort:** Very Low - frontend only, no backend changes

#### Implementation

**File:** `components/Map/SSTLayer.tsx` (new)

```typescript
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-map-gl';

interface SSTLayerProps {
  visible: boolean;
  opacity?: number;
}

export function SSTLayer({ visible, opacity = 0.7 }: SSTLayerProps) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;

    // Copernicus WMTS SST layer (public, no auth needed)
    const sourceId = 'copernicus-sst';
    const layerId = 'sst-layer';

    // WMTS URL for Global SST Analysis
    // Product: SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001
    const wmtsUrl = 'https://wmts.marine.copernicus.eu/tileserver/sst_glo_sst_l4_nrt_observations_010_001_sst/{z}/{x}/{y}.png';

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [wmtsUrl],
        tileSize: 256,
        attribution: '© Copernicus Marine Service'
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': visible ? opacity : 0
        }
      });
    } else {
      map.setPaintProperty(layerId, 'raster-opacity', visible ? opacity : 0);
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, visible, opacity]);

  return null;
}
```

**File:** `components/Map/SSTLegend.tsx` (new)

```typescript
export function SSTLegend() {
  const gradientColors = [
    { temp: -2, color: '#313695' },
    { temp: 5, color: '#4575b4' },
    { temp: 10, color: '#74add1' },
    { temp: 15, color: '#abd9e9' },
    { temp: 20, color: '#ffffbf' },
    { temp: 25, color: '#fee090' },
    { temp: 28, color: '#fdae61' },
    { temp: 30, color: '#f46d43' },
    { temp: 32, color: '#d73027' },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
      <p className="text-xs font-medium text-gray-700 mb-2">Sea Surface Temperature</p>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">-2°C</span>
        <div
          className="h-3 w-32 rounded"
          style={{
            background: `linear-gradient(to right, ${gradientColors.map(c => c.color).join(', ')})`
          }}
        />
        <span className="text-xs text-gray-500">32°C</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">© Copernicus Marine</p>
    </div>
  );
}
```

**Integration:** Add toggle to `MapFilterPanel.tsx` (similar to fishing layer toggle)

### 1.2 Marine Heatwave Alert System

**What:** Detect and alert users when MPAs experience abnormal warming
**Effort:** Medium - backend enhancement + frontend component

#### Backend Enhancement

**File:** `apps/data-service/app/services/copernicus.py`

Add marine heatwave detection to existing Copernicus service:

```python
from datetime import datetime, timedelta
from typing import Optional, Literal
from pydantic import BaseModel

class MarineHeatwaveAlert(BaseModel):
    """Marine heatwave classification based on Hobday et al. (2018)"""
    mpa_id: str
    current_sst: float
    climatological_mean: float
    threshold_90th: float
    anomaly: float
    category: Literal['none', 'moderate', 'strong', 'severe', 'extreme']
    days_duration: int
    peak_intensity: float
    affected_area_pct: float
    coral_bleaching_risk: Literal['low', 'moderate', 'high', 'very_high']
    alert_message: Optional[str]
    detected_at: datetime

# Add to CopernicusService class
async def detect_marine_heatwave(
    self,
    lat: float,
    lon: float,
    mpa_id: str,
    is_coral_mpa: bool = False
) -> MarineHeatwaveAlert:
    """
    Detect marine heatwave conditions for an MPA.

    Marine heatwave categories (Hobday et al. 2018):
    - Moderate: SST > 90th percentile
    - Strong: 2x above 90th percentile threshold
    - Severe: 3x above threshold
    - Extreme: 4x above threshold

    Coral bleaching thresholds (NOAA Coral Reef Watch):
    - Watch: 0-1 DHW (Degree Heating Weeks)
    - Warning: 1-4 DHW
    - Alert Level 1: 4-8 DHW
    - Alert Level 2: >8 DHW
    """
    # Fetch current SST
    current_sst = await self.get_sst(lat, lon)

    # Get climatological baseline (would need historical data or use NOAA MMM)
    # For now, use latitude-based climatological mean
    climatological_mean = self._get_climatological_sst(lat, lon)
    threshold_90th = climatological_mean + 1.0  # Approximate 90th percentile

    anomaly = current_sst - climatological_mean

    # Classify heatwave category
    if anomaly <= 0:
        category = 'none'
    elif anomaly < 1.0:
        category = 'moderate'
    elif anomaly < 2.0:
        category = 'strong'
    elif anomaly < 3.0:
        category = 'severe'
    else:
        category = 'extreme'

    # Coral bleaching risk assessment
    if is_coral_mpa:
        if anomaly < 0.5:
            coral_risk = 'low'
        elif anomaly < 1.0:
            coral_risk = 'moderate'
        elif anomaly < 2.0:
            coral_risk = 'high'
        else:
            coral_risk = 'very_high'
    else:
        coral_risk = 'low'

    # Generate alert message
    alert_message = None
    if category != 'none':
        alert_message = f"Marine heatwave detected: {category.title()} ({anomaly:+.1f}°C above normal)"
        if coral_risk in ['high', 'very_high']:
            alert_message += f". Coral bleaching risk: {coral_risk.replace('_', ' ').title()}"

    return MarineHeatwaveAlert(
        mpa_id=mpa_id,
        current_sst=current_sst,
        climatological_mean=climatological_mean,
        threshold_90th=threshold_90th,
        anomaly=anomaly,
        category=category,
        days_duration=0,  # Would need time series to calculate
        peak_intensity=anomaly,
        affected_area_pct=100.0,  # Would need spatial analysis
        coral_bleaching_risk=coral_risk,
        alert_message=alert_message,
        detected_at=datetime.utcnow()
    )

def _get_climatological_sst(self, lat: float, lon: float) -> float:
    """
    Get climatological mean SST for location.
    Uses NOAA OISST climatology patterns.
    """
    import math
    month = datetime.utcnow().month

    # Base temperature by latitude (tropical warmest)
    lat_factor = math.cos(math.radians(lat))
    base_temp = 28 * lat_factor + 2  # 2-30°C range

    # Seasonal adjustment (opposite in southern hemisphere)
    if lat >= 0:
        seasonal = 3 * math.cos(math.radians((month - 8) * 30))
    else:
        seasonal = 3 * math.cos(math.radians((month - 2) * 30))

    return base_temp + seasonal
```

#### API Endpoint

**File:** `apps/data-service/app/routers/health.py`

```python
@router.get("/api/v1/heatwave/{mpa_id}")
async def get_heatwave_status(
    mpa_id: str,
    lat: float,
    lon: float,
    is_coral: bool = False
):
    """Check marine heatwave status for an MPA"""
    copernicus = CopernicusService()
    alert = await copernicus.detect_marine_heatwave(lat, lon, mpa_id, is_coral)
    return alert
```

#### Frontend Component

**File:** `components/HeatwaveAlert.tsx` (new)

```typescript
'use client';

import { Icon, Badge } from '@/components/ui';

interface HeatwaveAlertProps {
  alert: {
    category: 'none' | 'moderate' | 'strong' | 'severe' | 'extreme';
    anomaly: number;
    current_sst: float;
    coral_bleaching_risk: 'low' | 'moderate' | 'high' | 'very_high';
    alert_message: string | null;
  };
  isCoral?: boolean;
}

export function HeatwaveAlert({ alert, isCoral }: HeatwaveAlertProps) {
  if (alert.category === 'none') return null;

  const categoryColors = {
    moderate: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    strong: 'bg-orange-50 border-orange-400 text-orange-800',
    severe: 'bg-red-50 border-red-400 text-red-800',
    extreme: 'bg-red-100 border-red-600 text-red-900',
  };

  const categoryIcons = {
    moderate: 'temperature-high',
    strong: 'temperature-high',
    severe: 'fire',
    extreme: 'fire-flame-curved',
  };

  return (
    <div className={`rounded-xl border-l-4 p-4 ${categoryColors[alert.category]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon name={categoryIcons[alert.category]} className="text-2xl" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">
            Marine Heatwave Alert
            <Badge
              variant={alert.category === 'extreme' ? 'danger' : 'warning'}
              size="sm"
              className="ml-2"
            >
              {alert.category.toUpperCase()}
            </Badge>
          </h4>
          <p className="text-sm mb-2">
            Current SST: <strong>{alert.current_sst.toFixed(1)}°C</strong>
            {' '}({alert.anomaly > 0 ? '+' : ''}{alert.anomaly.toFixed(1)}°C from normal)
          </p>
          {isCoral && alert.coral_bleaching_risk !== 'low' && (
            <p className="text-sm">
              <Icon name="coral" size="sm" className="mr-1" />
              Coral bleaching risk: <strong>{alert.coral_bleaching_risk.replace('_', ' ')}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Hook for Data Fetching

**File:** `hooks/useHeatwaveAlert.ts` (new)

```typescript
import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/lib/api/data-service';

interface UseHeatwaveAlertOptions {
  mpaId: string;
  lat: number;
  lon: number;
  isCoral?: boolean;
  enabled?: boolean;
}

export function useHeatwaveAlert({
  mpaId,
  lat,
  lon,
  isCoral = false,
  enabled = true
}: UseHeatwaveAlertOptions) {
  return useQuery({
    queryKey: ['heatwave', mpaId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DATA_SERVICE_URL}/api/v1/heatwave/${mpaId}?lat=${lat}&lon=${lon}&is_coral=${isCoral}`
      );
      if (!response.ok) throw new Error('Failed to fetch heatwave data');
      return response.json();
    },
    enabled: enabled && !!mpaId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
  });
}
```

### 1.3 Integration Points

**MPA Detail Page** (`app/(app)/ocean-pulse-app/mpa/[id]/page.tsx`):
- Add `HeatwaveAlert` component above or within the Habitat Quality section
- Show when `alert.category !== 'none'`
- Highlight coral MPAs with bleaching risk

**Health Score** (`useHybridHealthScore.ts`):
- Increase thermal_stress weight when heatwave active
- Factor heatwave category into confidence level

---

## Phase 2: Chlorophyll & Enhanced Health Score (P1)

**Goal:** Add productivity monitoring and improve Health Score reliability
**Timeline:** 2-3 weeks
**User Impact:** High - more accurate ecosystem health assessment

### 2.1 Chlorophyll Monitoring & Algal Bloom Detection

**What:** Monitor chlorophyll concentrations to detect algal blooms and assess productivity

#### Backend Enhancement

**File:** `apps/data-service/app/services/copernicus.py`

```python
class ChlorophyllData(BaseModel):
    """Chlorophyll concentration and productivity assessment"""
    mpa_id: str
    chlorophyll_mgm3: float
    productivity_level: Literal['oligotrophic', 'mesotrophic', 'eutrophic', 'bloom']
    bloom_detected: bool
    bloom_severity: Optional[Literal['minor', 'moderate', 'major', 'harmful']]
    trend_7day: Literal['increasing', 'stable', 'decreasing']
    data_quality: Literal['satellite', 'modeled', 'estimated']
    alert_message: Optional[str]
    measured_at: datetime

async def get_chlorophyll_analysis(
    self,
    lat: float,
    lon: float,
    mpa_id: str
) -> ChlorophyllData:
    """
    Analyze chlorophyll concentration for productivity and bloom assessment.

    Trophic classification (typical open ocean):
    - Oligotrophic: <0.1 mg/m³ (low productivity, clear water)
    - Mesotrophic: 0.1-0.3 mg/m³ (moderate)
    - Eutrophic: 0.3-1.0 mg/m³ (high productivity)
    - Bloom: >1.0 mg/m³ (potential algal bloom)

    Harmful algal bloom thresholds vary by species/region.
    """
    # Fetch from Copernicus BGC model
    chl = await self._fetch_bgc_parameter('chl', lat, lon)

    # Classify productivity
    if chl < 0.1:
        productivity = 'oligotrophic'
    elif chl < 0.3:
        productivity = 'mesotrophic'
    elif chl < 1.0:
        productivity = 'eutrophic'
    else:
        productivity = 'bloom'

    # Bloom detection and severity
    bloom_detected = chl > 1.0
    bloom_severity = None
    alert_message = None

    if bloom_detected:
        if chl < 3.0:
            bloom_severity = 'minor'
        elif chl < 10.0:
            bloom_severity = 'moderate'
            alert_message = f"Elevated chlorophyll ({chl:.1f} mg/m³) - potential algal bloom"
        elif chl < 20.0:
            bloom_severity = 'major'
            alert_message = f"Algal bloom detected ({chl:.1f} mg/m³) - monitor for harmful species"
        else:
            bloom_severity = 'harmful'
            alert_message = f"Severe bloom ({chl:.1f} mg/m³) - possible harmful algal bloom (HAB)"

    return ChlorophyllData(
        mpa_id=mpa_id,
        chlorophyll_mgm3=chl,
        productivity_level=productivity,
        bloom_detected=bloom_detected,
        bloom_severity=bloom_severity,
        trend_7day='stable',  # Would need time series
        data_quality='satellite',
        alert_message=alert_message,
        measured_at=datetime.utcnow()
    )
```

### 2.2 Enhanced Health Score Calculation

**What:** Replace OBIS point data with continuous Copernicus coverage

#### Updated Health Score Algorithm

**File:** `apps/data-service/app/services/health.py`

```python
class EnhancedHealthScore(BaseModel):
    """Enhanced health score with Copernicus data"""
    overall_score: int  # 0-100
    confidence: Literal['high', 'medium', 'low']
    data_completeness: float  # 0-1

    components: dict = {
        'biodiversity': {
            'score': int,
            'weight': 0.25,
            'source': 'OBIS',
            'metrics': ['species_richness', 'shannon_index', 'recent_activity']
        },
        'thermal_health': {
            'score': int,
            'weight': 0.25,
            'source': 'Copernicus SST',
            'metrics': ['sst_anomaly', 'heatwave_status', 'thermal_stress_days']
        },
        'water_quality': {
            'score': int,
            'weight': 0.20,
            'source': 'Copernicus BGC',
            'metrics': ['dissolved_oxygen', 'ph', 'salinity']
        },
        'productivity': {
            'score': int,
            'weight': 0.15,
            'source': 'Copernicus Chlorophyll',
            'metrics': ['chlorophyll', 'bloom_status', 'productivity_level']
        },
        'fishing_pressure': {
            'score': int,
            'weight': 0.10,
            'source': 'Global Fishing Watch',
            'metrics': ['fishing_hours', 'compliance', 'iuu_risk']
        },
        'community_assessment': {
            'score': int,
            'weight': 0.05,
            'source': 'User Observations',
            'metrics': ['avg_rating', 'observation_count']
        }
    }

    alerts: list[str]  # Active alerts (heatwave, bloom, etc.)
    recommendations: list[str]  # Conservation recommendations

async def calculate_enhanced_health_score(
    self,
    mpa_id: str,
    lat: float,
    lon: float,
    is_coral: bool = False
) -> EnhancedHealthScore:
    """
    Calculate comprehensive health score using all available data sources.

    Key improvements over previous algorithm:
    1. Continuous SST coverage vs sparse OBIS points
    2. Real-time anomaly detection
    3. Chlorophyll/productivity integration
    4. Marine heatwave status affects thermal score
    5. Data quality weighting (satellite > modeled > estimated)
    """
    copernicus = CopernicusService()

    # Gather all data
    env_data = await copernicus.get_environmental_data(lat, lon)
    heatwave = await copernicus.detect_marine_heatwave(lat, lon, mpa_id, is_coral)
    chlorophyll = await copernicus.get_chlorophyll_analysis(lat, lon, mpa_id)
    species = await self.obis.get_species_data(lat, lon)

    # Calculate component scores
    thermal_score = self._calculate_thermal_score(env_data, heatwave)
    water_score = self._calculate_water_quality_score(env_data)
    productivity_score = self._calculate_productivity_score(chlorophyll)
    biodiversity_score = self._calculate_biodiversity_score(species)

    # Aggregate with weights
    # ... implementation

    return EnhancedHealthScore(...)
```

### 2.3 Frontend Health Score Enhancement

**File:** `components/HealthScoreModal.tsx`

Add visual breakdown showing data sources:
- Show which components use Copernicus (satellite icon)
- Show which use OBIS (database icon)
- Show data freshness (last updated timestamp)
- Indicate when using estimated vs measured data

---

## Phase 3: 10-Day Forecast Widget (P2)

**Goal:** Give users predictive capabilities for planning and early warning
**Timeline:** 2 weeks
**User Impact:** High - transforms reactive to proactive monitoring

### 3.1 Forecast Data Fetching

**Backend:**

```python
class ForecastData(BaseModel):
    """10-day environmental forecast"""
    mpa_id: str
    forecast_generated: datetime
    daily_forecasts: list[DailyForecast]

class DailyForecast(BaseModel):
    date: date
    sst: float
    sst_anomaly: float
    wave_height: Optional[float]
    wind_speed: Optional[float]
    conditions: Literal['excellent', 'good', 'fair', 'poor', 'hazardous']
    alerts: list[str]
    diving_suitable: bool
    notes: Optional[str]

async def get_10day_forecast(
    self,
    lat: float,
    lon: float,
    mpa_id: str
) -> ForecastData:
    """
    Fetch 10-day ocean forecast from Copernicus.

    Products used:
    - GLOBAL_ANALYSISFORECAST_PHY_001_024 (physics: SST, currents)
    - GLOBAL_ANALYSISFORECAST_WAV_001_027 (waves)
    """
    # Implementation using copernicusmarine library
    # with forecast=True parameter
    pass
```

### 3.2 Forecast Widget Component

**File:** `components/ForecastWidget.tsx` (new)

```typescript
'use client';

import { Icon } from '@/components/ui';

interface ForecastWidgetProps {
  forecast: {
    daily_forecasts: Array<{
      date: string;
      sst: number;
      conditions: 'excellent' | 'good' | 'fair' | 'poor' | 'hazardous';
      diving_suitable: boolean;
      alerts: string[];
    }>;
  };
}

export function ForecastWidget({ forecast }: ForecastWidgetProps) {
  const conditionColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-orange-100 text-orange-800',
    hazardous: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="font-semibold text-balean-navy mb-4 flex items-center gap-2">
        <Icon name="calendar" className="text-balean-cyan" />
        10-Day Forecast
      </h3>

      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {forecast.daily_forecasts.map((day, i) => (
          <div
            key={day.date}
            className={`text-center p-2 rounded-lg ${conditionColors[day.conditions]}`}
          >
            <p className="text-xs font-medium">
              {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
            </p>
            <p className="text-lg font-bold">{Math.round(day.sst)}°</p>
            {day.diving_suitable && (
              <Icon name="water" size="sm" className="mx-auto" title="Good for diving" />
            )}
            {day.alerts.length > 0 && (
              <Icon name="triangle-exclamation" size="sm" className="mx-auto text-orange-600" />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Forecast data © Copernicus Marine Service
      </p>
    </div>
  );
}
```

---

## Phase 4: Ocean Currents & Advanced Features (P3-P4)

**Goal:** Complete environmental picture with currents, sea level, and long-term trends
**Timeline:** 3-4 weeks
**User Impact:** Medium - advanced features for power users

### 4.1 Ocean Currents Visualization

**What:** Show current patterns to illustrate species connectivity between MPAs

**Backend:** Add current velocity fetching to Copernicus service

**Frontend:** Animated particle flow layer on maps (using deck.gl or custom WebGL)

### 4.2 Sea Level & Wave Data

**What:** Coastal resilience indicators for nearshore MPAs

**Use cases:**
- Storm surge risk assessment
- Coastal erosion monitoring
- Optimal survey timing

### 4.3 Multi-Year Climate Trends

**What:** Long-term analysis using Copernicus reanalysis data (1993-present)

**Use cases:**
- Show how SST has changed since MPA establishment
- Identify accelerating warming trends
- Support climate adaptation planning

---

## Implementation Checklist

### Phase 1: SST & Heatwave Alerts
- [ ] Add WMTS SST layer to map (`components/Map/SSTLayer.tsx`)
- [ ] Create SST legend component
- [ ] Add toggle to MapFilterPanel
- [ ] Implement heatwave detection in backend
- [ ] Add `/api/v1/heatwave/{mpa_id}` endpoint
- [ ] Create `HeatwaveAlert` component
- [ ] Create `useHeatwaveAlert` hook
- [ ] Integrate into MPA detail page
- [ ] Add heatwave status to health score

### Phase 2: Chlorophyll & Health Score
- [ ] Implement chlorophyll analysis in backend
- [ ] Add bloom detection logic
- [ ] Create `/api/v1/chlorophyll/{mpa_id}` endpoint
- [ ] Refactor health score calculation
- [ ] Update `HealthScoreModal` with data sources
- [ ] Add productivity metrics to environmental dashboard

### Phase 3: Forecasts
- [ ] Implement forecast fetching in backend
- [ ] Add `/api/v1/forecast/{mpa_id}` endpoint
- [ ] Create `ForecastWidget` component
- [ ] Create `useForecast` hook
- [ ] Add to MPA detail page
- [ ] Add forecast-based alerts

### Phase 4: Advanced Features
- [ ] Ocean currents data fetching
- [ ] Currents visualization layer
- [ ] Sea level endpoint
- [ ] Wave data endpoint
- [ ] Multi-year trends analysis
- [ ] Climate change impact widget

---

## Environment Variables Required

```bash
# Already configured
COPERNICUS_USERNAME=your-username
COPERNICUS_PASSWORD=your-password

# No additional env vars needed - WMS endpoints are public
```

---

## Data Attribution

All Copernicus-derived features must include attribution:

```
© Copernicus Marine Service
```

This should appear:
- On map overlays (SST, chlorophyll layers)
- In forecast widgets
- In health score modal (source column)
- In any exported reports

---

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 2 Target |
|--------|---------|----------------|----------------|
| Health score data freshness | Days-weeks | < 24 hours | < 6 hours |
| Spatial coverage per MPA | ~5% (observation points) | 100% (gridded) | 100% |
| Forecast capability | None | 10 days | 10 days |
| Alert types | 0 | 2 (heatwave, coral) | 4 (+bloom, storm) |
| User engagement (return visits) | Baseline | +20% | +40% |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Copernicus API downtime | Fallback to cached data + estimation functions (already implemented) |
| Rate limiting | Cache aggressively (1-hour TTL for environmental data) |
| Data gaps in remote areas | Clearly indicate data quality; use modeled data with appropriate labeling |
| Overwhelming users with alerts | Allow notification preferences; only show actionable alerts |

---

## References

- [Copernicus Marine Data Store](https://data.marine.copernicus.eu/products)
- [Marine Heatwave Definition (Hobday et al. 2018)](https://doi.org/10.1016/j.pocean.2018.02.003)
- [NOAA Coral Reef Watch](https://coralreefwatch.noaa.gov/)
- [Harmful Algal Bloom Monitoring](https://coastalscience.noaa.gov/research/stressor-impacts-mitigation/hab-forecasts/)
