"""API router for health score endpoints."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.models.health import HealthScore, MPALocation, EnvironmentalData, SpeciesData, MarineHeatwaveAlert
from app.services.health import get_health_calculator
from app.services.copernicus import get_copernicus_service
from app.services.obis import get_obis_service

router = APIRouter()


@router.get("/health/{mpa_id}", response_model=HealthScore)
async def get_health_score(
    mpa_id: str,
    name: str = Query(..., description="MPA name"),
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Calculate health score for an MPA.

    Returns comprehensive health assessment including:
    - Overall health score (0-100)
    - Component breakdown (biodiversity, water quality, thermal stress, productivity)
    - Environmental data from Copernicus
    - Species data from OBIS
    """
    try:
        mpa = MPALocation(
            id=mpa_id,
            name=name,
            lat=lat,
            lon=lon,
        )

        calculator = get_health_calculator()
        health_score = await calculator.calculate_health_score(mpa)

        return health_score

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate health score: {str(e)}",
        )


@router.get("/environmental/{mpa_id}", response_model=EnvironmentalData)
async def get_environmental_data(
    mpa_id: str,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Get environmental data for an MPA location.

    Returns sea surface temperature, chlorophyll, oxygen, pH, and salinity.
    """
    try:
        copernicus = get_copernicus_service()
        env_data = await copernicus.get_environmental_data(
            lat=lat,
            lon=lon,
            mpa_id=mpa_id,
        )
        return env_data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch environmental data: {str(e)}",
        )


@router.get("/species/{mpa_id}", response_model=SpeciesData)
async def get_species_data(
    mpa_id: str,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(50, ge=1, le=500, description="Search radius in km"),
):
    """
    Get species biodiversity data for an MPA location from OBIS.

    Returns species counts, observation statistics, and biodiversity index.
    """
    try:
        obis = get_obis_service()
        species_data = await obis.get_species_data(
            lat=lat,
            lon=lon,
            mpa_id=mpa_id,
            radius_km=radius_km,
        )
        return species_data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch species data: {str(e)}",
        )


@router.get("/species/{mpa_id}/list")
async def get_species_list(
    mpa_id: str,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(50, ge=1, le=500, description="Search radius in km"),
    limit: int = Query(20, ge=1, le=100, description="Maximum species to return"),
):
    """
    Get list of species observed near an MPA.

    Returns scientific names, common names, taxonomy, and conservation status.
    """
    try:
        obis = get_obis_service()
        species_list = await obis.get_species_list(
            lat=lat,
            lon=lon,
            radius_km=radius_km,
            limit=limit,
        )
        return {"species": species_list, "total": len(species_list)}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch species list: {str(e)}",
        )


@router.get("/sst/{mpa_id}/timeseries")
async def get_sst_timeseries(
    mpa_id: str,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    days: int = Query(30, ge=7, le=365, description="Number of days of history"),
):
    """
    Get sea surface temperature time series for an MPA.

    Returns daily SST values for trend analysis.
    """
    try:
        copernicus = get_copernicus_service()
        timeseries = await copernicus.get_sst_timeseries(
            lat=lat,
            lon=lon,
            days=days,
        )
        return {"mpa_id": mpa_id, "timeseries": timeseries}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch SST timeseries: {str(e)}",
        )


@router.get("/heatwave/{mpa_id}", response_model=MarineHeatwaveAlert)
async def get_heatwave_alert(
    mpa_id: str,
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Detect marine heatwave conditions for an MPA.

    Returns heatwave status using Hobday et al. 2018 classification:
    - Category I (Moderate): 1-2x threshold exceedance
    - Category II (Strong): 2-3x threshold exceedance
    - Category III (Severe): 3-4x threshold exceedance
    - Category IV (Extreme): 4x+ threshold exceedance

    Includes ecological impact assessment and monitoring recommendations.
    """
    try:
        copernicus = get_copernicus_service()
        alert = await copernicus.detect_marine_heatwave(
            lat=lat,
            lon=lon,
            mpa_id=mpa_id,
        )
        return alert

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect heatwave conditions: {str(e)}",
        )
