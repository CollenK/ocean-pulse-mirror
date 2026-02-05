"""API router for MPA polygon refresh operations."""

import asyncio
import logging
import sys
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client

from app.config import get_settings
from app.services.protected_planet import get_protected_planet_service

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class PolygonRefreshResult(BaseModel):
    """Result of polygon refresh operation."""
    total_mpas: int
    updated: int
    skipped: int
    failed: int
    errors: list[str]


class PolygonRefreshStatus(BaseModel):
    """Status response for polygon refresh."""
    status: str
    message: str
    result: Optional[PolygonRefreshResult] = None


def get_supabase_client() -> Client:
    """Create Supabase client with service role key."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ValueError("Supabase credentials not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def verify_api_key(x_api_key: str = Header(...)) -> bool:
    """Verify the pipeline API key."""
    settings = get_settings()
    if not settings.pipeline_api_key:
        raise HTTPException(status_code=500, detail="Pipeline API key not configured")
    if x_api_key != settings.pipeline_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


async def refresh_single_polygon(
    supabase: Client,
    mpa_id: str,
    wdpa_id: str,
    service,
) -> tuple[bool, Optional[str]]:
    """
    Refresh polygon for a single MPA.

    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Fetch polygon from Protected Planet
        wkt_geometry = await service.fetch_mpa_polygon(wdpa_id)

        if not wkt_geometry:
            return False, f"No geometry available for WDPA ID {wdpa_id}"

        # Update geometry in Supabase via RPC
        result = supabase.rpc(
            "update_mpa_geometry",
            {"mpa_uuid": mpa_id, "geom_wkt": wkt_geometry}
        ).execute()

        return True, None

    except Exception as e:
        error_msg = f"Error updating MPA {mpa_id}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg


async def run_polygon_refresh(
    skip_existing: bool = True,
    rate_limit_seconds: float = 1.0,
) -> PolygonRefreshResult:
    """
    Run polygon refresh for all MPAs.

    Args:
        skip_existing: Skip MPAs that already have real geometry
        rate_limit_seconds: Delay between API requests

    Returns:
        PolygonRefreshResult with statistics
    """
    settings = get_settings()
    supabase = get_supabase_client()
    service = get_protected_planet_service()

    errors: list[str] = []
    updated = 0
    skipped = 0
    failed = 0

    try:
        # Fetch all MPAs with their external_id (WDPA ID)
        query = supabase.table("mpas").select("id, external_id, name, geometry")

        result = query.execute()
        mpas = result.data or []

        total_mpas = len(mpas)
        print(f"[POLYGON REFRESH] Found {total_mpas} MPAs to process", flush=True)

        for i, mpa in enumerate(mpas):
            mpa_id = mpa["id"]
            wdpa_id = mpa.get("external_id")
            mpa_name = mpa.get("name", "Unknown")

            # Skip if no WDPA ID
            if not wdpa_id:
                logger.warning(f"Skipping MPA '{mpa_name}' - no WDPA ID")
                skipped += 1
                continue

            # Skip if already has real geometry (not null)
            if skip_existing and mpa.get("geometry"):
                logger.debug(f"Skipping MPA '{mpa_name}' - already has geometry")
                skipped += 1
                continue

            print(f"[{i+1}/{total_mpas}] Fetching polygon for '{mpa_name}' (WDPA: {wdpa_id})", flush=True)

            success, error = await refresh_single_polygon(
                supabase, mpa_id, wdpa_id, service
            )

            if success:
                updated += 1
                print(f"  -> Updated geometry for '{mpa_name}'", flush=True)
            else:
                failed += 1
                print(f"  -> Failed: {error}", flush=True)
                if error:
                    errors.append(error)

            # Rate limiting
            if i < total_mpas - 1:
                await asyncio.sleep(rate_limit_seconds)

        return PolygonRefreshResult(
            total_mpas=total_mpas,
            updated=updated,
            skipped=skipped,
            failed=failed,
            errors=errors[:10],  # Limit errors to first 10
        )

    except Exception as e:
        logger.error(f"Error in polygon refresh: {e}")
        raise
    finally:
        await service.close()


@router.post("/pipeline/refresh-polygons", response_model=PolygonRefreshStatus)
async def refresh_polygons(
    background_tasks: BackgroundTasks,
    skip_existing: bool = True,
    x_api_key: str = Header(...),
):
    """
    Trigger polygon refresh for all MPAs.

    This endpoint fetches real polygon boundaries from Protected Planet
    for all MPAs and stores them in the PostGIS geometry column.

    Requires API key authentication via X-API-Key header.

    Args:
        skip_existing: If true, skip MPAs that already have geometry (default: true)
        x_api_key: Pipeline API key for authentication

    Returns:
        Status message indicating refresh has started
    """
    verify_api_key(x_api_key)
    print(f"[POLYGON REFRESH] Starting refresh, skip_existing={skip_existing}", flush=True)

    # For now, run synchronously for simpler debugging
    # In production, you might want to run in background
    try:
        result = await run_polygon_refresh(skip_existing=skip_existing)
        print(f"[POLYGON REFRESH] Completed: {result}", flush=True)

        return PolygonRefreshStatus(
            status="completed",
            message=f"Polygon refresh completed. Updated: {result.updated}, Skipped: {result.skipped}, Failed: {result.failed}",
            result=result,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Polygon refresh failed: {str(e)}",
        )


@router.get("/pipeline/refresh-polygons/single/{wdpa_id}")
async def refresh_single(
    wdpa_id: str,
    x_api_key: str = Header(...),
):
    """
    Refresh polygon for a single MPA by WDPA ID.

    Useful for testing or updating individual MPAs.
    """
    verify_api_key(x_api_key)

    settings = get_settings()
    supabase = get_supabase_client()
    service = get_protected_planet_service()

    try:
        # Find MPA by external_id
        result = supabase.table("mpas").select("id, name").eq("external_id", wdpa_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail=f"MPA with WDPA ID {wdpa_id} not found")

        mpa = result.data
        success, error = await refresh_single_polygon(supabase, mpa["id"], wdpa_id, service)

        if success:
            return {
                "status": "success",
                "message": f"Updated geometry for '{mpa['name']}'",
            }
        else:
            return {
                "status": "failed",
                "message": error or "Unknown error",
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh polygon: {str(e)}",
        )
    finally:
        await service.close()
