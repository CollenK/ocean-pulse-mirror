# Copernicus Marine Service Integration

This document explores how [Copernicus Marine Service](https://marine.copernicus.eu/) (CMEMS) data could enhance the Ocean PULSE application.

## Overview

Copernicus Marine Service provides **free and open** scientifically-assessed ocean data covering:
- **Blue Ocean**: Physical ocean properties (temperature, currents, salinity)
- **White Ocean**: Sea ice observations
- **Green Ocean**: Biogeochemical parameters (chlorophyll, oxygen, nutrients)

The service offers hindcasts, nowcasts, and **10-day forecasts** updated daily - a significant enhancement over our current historical-only OBIS data.

## Relevant Data Products

### 1. Sea Surface Temperature (SST)

| Product | Resolution | Update Frequency | Use Case |
|---------|------------|------------------|----------|
| Global SST Analysis | 0.05° (~5km) | Daily | Real-time MPA temperature monitoring |
| SST Anomalies | 0.25° | Daily | Detect marine heatwaves, coral bleaching risk |
| Regional SST (European seas) | 0.01° (~1km) | Daily | High-resolution coastal monitoring |

**Enhancement for Ocean PULSE**: Replace or supplement our OBIS-ENV-DATA temperature readings with real-time satellite-derived SST data. Could power a "Marine Heatwave Alert" feature.

### 2. Ocean Currents

| Product | Resolution | Coverage | Use Case |
|---------|------------|----------|----------|
| Global Physics Analysis & Forecast | 0.083° (~8km), 50 depth levels | Global | Current patterns affecting species migration |
| In-situ Current Observations | Point data | Global | Validation, high-frequency radar data |

**Enhancement for Ocean PULSE**: Visualize ocean currents on MPA maps to show how species might move through protected areas. Could enhance tracking data interpretation.

### 3. Biogeochemistry & Ocean Health

| Product | Parameters | Resolution | Use Case |
|---------|------------|------------|----------|
| Global Biogeochemistry Forecast | Chlorophyll, oxygen, pH, nutrients, plankton | 0.25° | Ecosystem health indicators |
| Ocean Color (Satellite) | Chlorophyll, turbidity, optical properties | 4km (global), 1km (regional) | Algal bloom detection |
| Chlorophyll Gradient (NEW Nov 2024) | Horizontal chlorophyll gradient | 4km | Front detection, productivity hotspots |

**Enhancement for Ocean PULSE**:
- Add chlorophyll concentration to habitat quality metrics
- Detect algal blooms that could affect MPA health
- Monitor ocean acidification (pH data) for coral reef MPAs

### 4. Sea Level & Waves

| Product | Resolution | Use Case |
|---------|------------|----------|
| Sea Surface Height | 0.25° | Coastal MPA flood risk |
| Wave Analysis & Forecast | 0.083° | Storm impact assessment |

## API Access Options

### Python Toolbox (Backend Integration)

The [`copernicusmarine`](https://pypi.org/project/copernicusmarine/) Python library provides:

```python
import copernicusmarine

# Subset data for a specific MPA region
copernicusmarine.subset(
    dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m",
    variables=["thetao", "so"],  # temperature, salinity
    minimum_longitude=142.5,
    maximum_longitude=154.0,
    minimum_latitude=-24.5,
    maximum_latitude=-14.0,
    start_datetime="2024-01-01",
    end_datetime="2024-12-31",
    output_filename="gbr_temperature.nc"
)

# Or open remotely without downloading
ds = copernicusmarine.open_dataset(
    dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m",
    variables=["thetao"],
    minimum_longitude=142.5,
    maximum_longitude=154.0,
    minimum_latitude=-24.5,
    maximum_latitude=-14.0
)
```

### Web Services (Frontend Integration)

| Service | Protocol | Use Case |
|---------|----------|----------|
| WMTS | OGC Standard | Tile-based map overlays (fastest) |
| WMS | OGC Standard | Dynamic map layers |
| CSW | OGC Standard | Catalogue search |

**WMTS Example** for Leaflet integration:
```javascript
L.tileLayer('https://wmts.marine.copernicus.eu/tileserver/GLOBAL_ANALYSISFORECAST_PHY_001_024/{z}/{x}/{y}.png', {
    attribution: '© Copernicus Marine Service'
}).addTo(map);
```

**Note**: REST API is not currently available but is under development.

## Integration Architecture

### Option A: Backend Proxy (Recommended)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Ocean PULSE    │────▶│  Backend API     │────▶│  Copernicus     │
│  Frontend       │     │  (Python/Node)   │     │  Marine API     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Cache       │
                        │  (Redis)     │
                        └──────────────┘
```

**Benefits**:
- Server-side caching reduces API calls
- Can pre-process NetCDF data to JSON
- Manages authentication centrally
- Combines multiple data sources

### Option B: Direct WMTS (Visualization Only)

```
┌─────────────────┐     ┌─────────────────┐
│  Ocean PULSE    │────▶│  WMTS Tiles     │
│  Frontend       │     │  (Copernicus)   │
└─────────────────┘     └─────────────────┘
```

**Benefits**:
- No backend needed
- Fast tile-based rendering
- Works with Leaflet/Mapbox

**Limitations**:
- Visualization only, no data analysis
- Can't combine with other data sources

## Proposed Features

### Phase 1: Real-time SST Layer

Add sea surface temperature overlay to MPA maps:
- Color-coded temperature visualization
- Temperature anomaly alerts
- Marine heatwave warnings for coral MPAs

### Phase 2: Enhanced Habitat Quality Score

Incorporate Copernicus data into health score:

| Current Source | Copernicus Enhancement |
|----------------|------------------------|
| OBIS-ENV-DATA (historical) | Real-time SST + forecast |
| Single-point measurements | Gridded coverage of entire MPA |
| No chlorophyll data | Satellite chlorophyll + productivity |
| No current data | Ocean current patterns |

### Phase 3: Forecast Features

Leverage 10-day forecasts:
- "Upcoming Conditions" widget for each MPA
- Storm/heatwave early warnings
- Optimal diving/visiting conditions

### Phase 4: Climate Trend Analysis

Use multi-year reanalysis products (1993-present):
- Long-term temperature trends
- Sea level rise impact on coastal MPAs
- Historical vs current condition comparisons

## Registration & Costs

| Aspect | Details |
|--------|---------|
| Cost | **Free** for all data products |
| Registration | Required (free account) |
| Rate Limits | Generous, suitable for production |
| License | Open data, attribution required |
| Attribution | "© Copernicus Marine Service" |

Register at: https://data.marine.copernicus.eu/register

## Comparison: Current vs Enhanced

| Feature | Current (OBIS) | With Copernicus |
|---------|----------------|-----------------|
| Temperature | Historical point data | Real-time gridded + 10-day forecast |
| Spatial Coverage | Observation locations only | Full MPA coverage |
| Update Frequency | As submitted | Daily |
| Chlorophyll | Limited | Full satellite coverage |
| Currents | None | Global analysis + forecast |
| Sea Level | None | Satellite altimetry |
| Forecast | None | 10-day predictions |

## Technical Considerations

### Data Formats
- **NetCDF**: Primary format, requires server-side processing
- **GeoTIFF**: Available for some products
- **WMTS Tiles**: Pre-rendered for visualization

### Storage Requirements
- Raw NetCDF files can be large (GB per variable per month)
- Recommend: Query subsets via API rather than bulk download
- Cache processed JSON for frontend consumption

### Performance
- WMTS tiles: Fast, CDN-cached
- API subset queries: 5-30 seconds depending on size
- Recommend: Pre-fetch and cache MPA-specific data

## Next Steps

1. **Create Copernicus Marine account** at https://data.marine.copernicus.eu/register
2. **Prototype SST layer** using WMTS tiles on existing map
3. **Build backend service** to fetch and cache MPA-specific data
4. **Integrate into health score** calculation
5. **Add forecast widget** to MPA detail pages

## Resources

- [Copernicus Marine Data Store](https://data.marine.copernicus.eu/products)
- [Python Toolbox Documentation](https://toolbox-docs.marine.copernicus.eu/)
- [Help Center - API Guide](https://help.marine.copernicus.eu/en/articles/8283072-copernicus-marine-toolbox-api-subset)
- [WMTS Usage Guide](https://help.marine.copernicus.eu/en/articles/6478168-how-to-use-wmts-to-visualize-data)
- [Product Catalogue](https://data.marine.copernicus.eu/products)
