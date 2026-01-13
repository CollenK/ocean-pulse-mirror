#!/usr/bin/env python3
"""
WDPA Data Loader for Ocean PULSE

This script loads Marine Protected Areas from the WDPA (World Database on Protected Areas)
into the Supabase database.

Data Source: https://www.protectedplanet.net/en/thematic-areas/wdpa

Supports multiple formats:
- Shapefiles (.shp) - Primary format from Protected Planet
- CSV files (.csv)
- GeoJSON files (.json, .geojson)

Usage:
    1. Download WDPA data from Protected Planet
    2. Set environment variables:
       - SUPABASE_URL: Your Supabase project URL
       - SUPABASE_SERVICE_KEY: Your Supabase service role key (not anon key)
    3. Run: python scripts/load-wdpa-data.py --file path/to/shapefile.shp

For shapefile downloads that come as ZIPs:
    python scripts/load-wdpa-data.py --dir /path/to/WDPA_folder
"""

import argparse
import csv
import json
import os
import sys
import zipfile
import tempfile
from typing import Optional, List
from datetime import datetime
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# Check for geopandas (needed for shapefiles)
try:
    import geopandas as gpd
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False


# IUCN category to protection level mapping
IUCN_TO_PROTECTION = {
    'Ia': 'Strict Nature Reserve',
    'Ib': 'Wilderness Area',
    'II': 'National Park',
    'III': 'Natural Monument',
    'IV': 'Habitat/Species Management',
    'V': 'Protected Landscape/Seascape',
    'VI': 'Sustainable Use',
    'Not Reported': 'Not Reported',
    'Not Applicable': 'Not Applicable',
    'Not Assigned': 'Not Assigned',
}


def get_supabase_client() -> Client:
    """Create Supabase client from environment variables."""
    url = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_KEY')

    if not url:
        print("Error: SUPABASE_URL environment variable not set")
        sys.exit(1)

    if not key:
        print("Error: SUPABASE_SERVICE_KEY environment variable not set")
        print("Note: You need the service role key, not the anon key")
        sys.exit(1)

    return create_client(url, key)


def parse_year(value) -> Optional[int]:
    """Parse year from WDPA status year field."""
    if value is None or value == '' or value == 0:
        return None
    try:
        year = int(float(value))
        if 1800 <= year <= datetime.now().year:
            return year
    except (ValueError, TypeError):
        pass
    return None


def transform_shapefile_row(row: dict, centroid: tuple) -> Optional[dict]:
    """Transform a shapefile row to our MPA schema."""
    # Get WDPA ID (SITE_ID in shapefiles)
    wdpa_id = row.get('SITE_ID') or row.get('WDPAID') or row.get('SITE_PID')
    if not wdpa_id:
        return None

    # Get name (prefer English name)
    name = row.get('NAME_ENG') or row.get('NAME') or row.get('name')
    if not name:
        return None

    # Get area (prefer marine area)
    area = None
    for field in ['REP_M_AREA', 'GIS_M_AREA', 'REP_AREA', 'GIS_AREA']:
        val = row.get(field)
        if val is not None:
            try:
                area = float(val)
                if area > 0:
                    break
            except (ValueError, TypeError):
                continue

    # Get country code
    country = row.get('ISO3') or row.get('PRNT_ISO3') or ''

    # Get IUCN category and map to protection level
    iucn_cat = row.get('IUCN_CAT') or ''
    protection_level = IUCN_TO_PROTECTION.get(iucn_cat, iucn_cat or 'Not Reported')

    # Get established year
    established_year = parse_year(row.get('STATUS_YR'))

    # Get designation
    designation = row.get('DESIG_ENG') or row.get('DESIG') or ''

    # Build metadata
    metadata = {
        'wdpa_id': str(wdpa_id),
        'site_id': str(row.get('SITE_ID', '')),
        'iucn_category': iucn_cat,
        'designation': designation,
        'designation_type': row.get('DESIG_TYPE', ''),
        'governance_type': row.get('GOV_TYPE', ''),
        'management_authority': row.get('MANG_AUTH', ''),
        'status': row.get('STATUS', ''),
        'realm': row.get('REALM', ''),
        'no_take': row.get('NO_TAKE', ''),
        'no_take_area': row.get('NO_TK_AREA', ''),
        'site_type': row.get('SITE_TYPE', ''),
    }

    # Build the MPA record
    mpa = {
        'external_id': str(wdpa_id),
        'name': name,
        'country': country,
        'area_km2': area,
        'established_year': established_year,
        'protection_level': protection_level,
        'metadata': metadata,
    }

    # Add center point from centroid
    if centroid and len(centroid) >= 2:
        lon, lat = centroid[0], centroid[1]
        mpa['center'] = f'POINT({lon} {lat})'

    return mpa


def load_shapefile(file_path: str) -> List[dict]:
    """Load and parse shapefile using geopandas."""
    if not HAS_GEOPANDAS:
        print("Error: geopandas not installed. Run: pip install geopandas")
        sys.exit(1)

    mpas = []
    print(f"  Reading shapefile: {file_path}")

    gdf = gpd.read_file(file_path)
    print(f"  Found {len(gdf)} records")

    for idx, row in gdf.iterrows():
        # Get centroid from geometry
        try:
            centroid = (row.geometry.centroid.x, row.geometry.centroid.y)
        except Exception:
            centroid = None

        # Convert row to dict
        row_dict = row.drop('geometry').to_dict()

        mpa = transform_shapefile_row(row_dict, centroid)
        if mpa:
            mpas.append(mpa)

        if (idx + 1) % 1000 == 0:
            print(f"    Processed {idx + 1}/{len(gdf)} records...")

    return mpas


def load_csv(file_path: str) -> List[dict]:
    """Load and parse CSV file."""
    mpas = []

    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Try to get coordinates from CSV
            lat = row.get('LAT') or row.get('REP_LAT')
            lon = row.get('LONG') or row.get('LON') or row.get('REP_LONG')
            centroid = None
            if lat and lon:
                try:
                    centroid = (float(lon), float(lat))
                except (ValueError, TypeError):
                    pass

            mpa = transform_shapefile_row(row, centroid)
            if mpa:
                mpas.append(mpa)

    return mpas


def load_geojson(file_path: str) -> List[dict]:
    """Load and parse GeoJSON file."""
    mpas = []

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    for feature in features:
        props = feature.get('properties', {})

        # Extract centroid from geometry
        centroid = None
        geometry = feature.get('geometry', {})
        if geometry.get('type') == 'Point':
            coords = geometry.get('coordinates', [])
            if len(coords) >= 2:
                centroid = (coords[0], coords[1])
        elif geometry.get('type') in ('Polygon', 'MultiPolygon'):
            # Would need shapely to calculate centroid
            pass

        mpa = transform_shapefile_row(props, centroid)
        if mpa:
            mpas.append(mpa)

    return mpas


def find_shapefiles_in_dir(dir_path: str) -> List[str]:
    """Find all shapefile ZIPs and extract them, return list of .shp files."""
    dir_path = Path(dir_path)
    shp_files = []
    temp_dirs = []

    # Look for ZIP files
    zip_files = list(dir_path.glob('*.zip'))
    if zip_files:
        print(f"Found {len(zip_files)} ZIP files to process")

        for zip_file in zip_files:
            print(f"  Extracting: {zip_file.name}")
            temp_dir = tempfile.mkdtemp()
            temp_dirs.append(temp_dir)

            with zipfile.ZipFile(zip_file, 'r') as zf:
                zf.extractall(temp_dir)

            # Find .shp files in extracted content
            for shp in Path(temp_dir).glob('**/*-polygons.shp'):
                shp_files.append(str(shp))

    # Also look for already-extracted .shp files
    for shp in dir_path.glob('**/*-polygons.shp'):
        if str(shp) not in shp_files:
            shp_files.append(str(shp))

    return shp_files


def insert_mpas(supabase: Client, mpas: List[dict], batch_size: int = 100) -> int:
    """Insert MPAs into Supabase in batches."""
    inserted = 0

    for i in range(0, len(mpas), batch_size):
        batch = mpas[i:i + batch_size]

        try:
            # Upsert to handle duplicates
            result = supabase.table('mpas').upsert(
                batch,
                on_conflict='external_id'
            ).execute()

            inserted += len(batch)
            print(f"  Inserted {inserted}/{len(mpas)} MPAs...")

        except Exception as e:
            print(f"Error inserting batch {i//batch_size + 1}: {e}")
            # Try inserting one by one to identify problematic records
            for mpa in batch:
                try:
                    supabase.table('mpas').upsert(
                        mpa,
                        on_conflict='external_id'
                    ).execute()
                    inserted += 1
                except Exception as e2:
                    print(f"  Failed to insert MPA {mpa.get('name', 'unknown')}: {e2}")

    return inserted


def main():
    parser = argparse.ArgumentParser(
        description='Load WDPA Marine Protected Areas into Supabase'
    )
    parser.add_argument(
        '--file', '-f',
        help='Path to WDPA data file (shapefile, CSV, or GeoJSON)'
    )
    parser.add_argument(
        '--dir', '-d',
        help='Path to directory containing WDPA shapefile ZIPs'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=None,
        help='Limit number of MPAs to load (for testing)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Parse data without inserting into database'
    )

    args = parser.parse_args()

    if not args.file and not args.dir:
        print("Error: Must specify either --file or --dir")
        parser.print_help()
        sys.exit(1)

    mpas = []

    if args.dir:
        # Process directory with shapefile ZIPs
        if not os.path.isdir(args.dir):
            print(f"Error: Directory not found: {args.dir}")
            sys.exit(1)

        print(f"Processing WDPA directory: {args.dir}")
        shp_files = find_shapefiles_in_dir(args.dir)

        if not shp_files:
            print("Error: No polygon shapefiles found in directory")
            sys.exit(1)

        print(f"Found {len(shp_files)} polygon shapefiles")

        for shp_file in shp_files:
            file_mpas = load_shapefile(shp_file)
            mpas.extend(file_mpas)
            print(f"  Loaded {len(file_mpas)} MPAs from {Path(shp_file).name}")

    elif args.file:
        # Process single file
        if not os.path.exists(args.file):
            print(f"Error: File not found: {args.file}")
            sys.exit(1)

        file_ext = os.path.splitext(args.file)[1].lower()
        print(f"Loading WDPA data from: {args.file}")

        if file_ext == '.shp':
            mpas = load_shapefile(args.file)
        elif file_ext == '.csv':
            mpas = load_csv(args.file)
        elif file_ext in ('.json', '.geojson'):
            mpas = load_geojson(args.file)
        else:
            print(f"Error: Unsupported file format: {file_ext}")
            print("Supported formats: .shp, .csv, .json, .geojson")
            sys.exit(1)

    # Remove duplicates by external_id
    seen_ids = set()
    unique_mpas = []
    for mpa in mpas:
        if mpa['external_id'] not in seen_ids:
            seen_ids.add(mpa['external_id'])
            unique_mpas.append(mpa)
    mpas = unique_mpas

    print(f"\nTotal unique Marine Protected Areas: {len(mpas)}")

    if args.limit:
        mpas = mpas[:args.limit]
        print(f"Limited to {len(mpas)} MPAs")

    if args.dry_run:
        print("\n[DRY RUN] Would insert the following MPAs:")
        for mpa in mpas[:10]:
            center = mpa.get('center', 'No coordinates')
            print(f"  - {mpa['name']} ({mpa['country']}) - {center}")
        if len(mpas) > 10:
            print(f"  ... and {len(mpas) - 10} more")
        return

    # Connect to Supabase and insert
    print("\nConnecting to Supabase...")
    supabase = get_supabase_client()

    print("Inserting MPAs...")
    inserted = insert_mpas(supabase, mpas)

    print(f"\nDone! Inserted {inserted} Marine Protected Areas into Supabase.")


if __name__ == '__main__':
    main()
