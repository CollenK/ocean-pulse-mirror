#!/usr/bin/env python3
"""
WDPA Data Loader for Ocean PULSE

This script loads Marine Protected Areas from the WDPA (World Database on Protected Areas)
into the Supabase database.

Data Source: https://www.protectedplanet.net/en/thematic-areas/wdpa

Usage:
    1. Download WDPA data from Protected Planet (CSV or GeoJSON format)
    2. Set environment variables:
       - SUPABASE_URL: Your Supabase project URL
       - SUPABASE_SERVICE_KEY: Your Supabase service role key (not anon key)
    3. Run: python scripts/load-wdpa-data.py --file path/to/wdpa_data.csv

The script filters for marine protected areas (MARINE field = '1' or '2')
and loads them into the mpas table.
"""

import argparse
import csv
import json
import os
import sys
from typing import Optional
from datetime import datetime

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)


# WDPA field mappings to our schema
WDPA_FIELD_MAP = {
    'WDPAID': 'external_id',
    'NAME': 'name',
    'ISO3': 'country',
    'REP_M_AREA': 'area_km2',  # Marine area
    'REP_AREA': 'area_km2',    # Total area (fallback)
    'STATUS_YR': 'established_year',
    'IUCN_CAT': 'protection_level',
    'DESIG_ENG': 'designation',
}

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


def parse_coordinates(row: dict) -> Optional[tuple]:
    """Extract center coordinates from WDPA row."""
    # Try different field names for coordinates
    lat_fields = ['LAT', 'LATITUDE', 'lat', 'latitude', 'REP_LAT']
    lon_fields = ['LONG', 'LON', 'LONGITUDE', 'long', 'lon', 'longitude', 'REP_LONG']

    lat = None
    lon = None

    for field in lat_fields:
        if field in row and row[field]:
            try:
                lat = float(row[field])
                break
            except (ValueError, TypeError):
                continue

    for field in lon_fields:
        if field in row and row[field]:
            try:
                lon = float(row[field])
                break
            except (ValueError, TypeError):
                continue

    if lat is not None and lon is not None:
        return (lat, lon)
    return None


def is_marine_protected_area(row: dict) -> bool:
    """Check if the row represents a marine protected area."""
    marine_field = row.get('MARINE', row.get('marine', ''))
    # MARINE values: 0 = terrestrial only, 1 = coastal (partial marine), 2 = marine only
    return str(marine_field) in ('1', '2')


def parse_year(value: str) -> Optional[int]:
    """Parse year from WDPA status year field."""
    if not value or value == '0':
        return None
    try:
        year = int(float(value))
        if 1800 <= year <= datetime.now().year:
            return year
    except (ValueError, TypeError):
        pass
    return None


def transform_wdpa_row(row: dict) -> Optional[dict]:
    """Transform a WDPA row to our MPA schema."""
    # Skip non-marine areas
    if not is_marine_protected_area(row):
        return None

    # Get WDPA ID
    wdpa_id = row.get('WDPAID', row.get('wdpaid', ''))
    if not wdpa_id:
        return None

    # Get name
    name = row.get('NAME', row.get('name', ''))
    if not name:
        return None

    # Get coordinates
    coords = parse_coordinates(row)

    # Get area (prefer marine area over total area)
    area = None
    for field in ['REP_M_AREA', 'GIS_M_AREA', 'REP_AREA', 'GIS_AREA']:
        if field in row and row[field]:
            try:
                area = float(row[field])
                if area > 0:
                    break
            except (ValueError, TypeError):
                continue

    # Get country code
    country = row.get('ISO3', row.get('iso3', row.get('PARENT_ISO3', '')))

    # Get IUCN category and map to protection level
    iucn_cat = row.get('IUCN_CAT', row.get('iucn_cat', ''))
    protection_level = IUCN_TO_PROTECTION.get(iucn_cat, iucn_cat or 'Not Reported')

    # Get established year
    established_year = parse_year(row.get('STATUS_YR', row.get('status_yr', '')))

    # Get designation
    designation = row.get('DESIG_ENG', row.get('desig_eng', ''))

    # Build metadata
    metadata = {
        'wdpa_id': str(wdpa_id),
        'iucn_category': iucn_cat,
        'designation': designation,
        'designation_type': row.get('DESIG_TYPE', row.get('desig_type', '')),
        'governance_type': row.get('GOV_TYPE', row.get('gov_type', '')),
        'management_authority': row.get('MANG_AUTH', row.get('mang_auth', '')),
        'status': row.get('STATUS', row.get('status', '')),
        'marine_type': row.get('MARINE', row.get('marine', '')),  # 1=coastal, 2=marine only
        'no_take': row.get('NO_TAKE', row.get('no_take', '')),
        'no_take_area': row.get('NO_TK_AREA', row.get('no_tk_area', '')),
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

    # Add center point if we have coordinates
    if coords:
        lat, lon = coords
        # Store as WKT for PostGIS
        mpa['center'] = f'POINT({lon} {lat})'

    return mpa


def load_csv(file_path: str) -> list:
    """Load and parse CSV file."""
    mpas = []

    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mpa = transform_wdpa_row(row)
            if mpa:
                mpas.append(mpa)

    return mpas


def load_geojson(file_path: str) -> list:
    """Load and parse GeoJSON file."""
    mpas = []

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    for feature in features:
        props = feature.get('properties', {})
        mpa = transform_wdpa_row(props)

        if mpa:
            # Extract center from geometry if available
            geometry = feature.get('geometry', {})
            if geometry.get('type') == 'Point':
                coords = geometry.get('coordinates', [])
                if len(coords) >= 2:
                    mpa['center'] = f'POINT({coords[0]} {coords[1]})'
            elif geometry.get('type') in ('Polygon', 'MultiPolygon'):
                # For polygons, we'd need to calculate centroid
                # For now, use any existing center coordinates
                pass

            mpas.append(mpa)

    return mpas


def insert_mpas(supabase: Client, mpas: list, batch_size: int = 100) -> int:
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
        required=True,
        help='Path to WDPA data file (CSV or GeoJSON)'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=None,
        help='Limit number of MPAs to load (for testing)'
    )
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='Parse data without inserting into database'
    )

    args = parser.parse_args()

    # Check file exists
    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    # Determine file type
    file_ext = os.path.splitext(args.file)[1].lower()

    print(f"Loading WDPA data from: {args.file}")

    if file_ext == '.csv':
        mpas = load_csv(args.file)
    elif file_ext in ('.json', '.geojson'):
        mpas = load_geojson(args.file)
    else:
        print(f"Error: Unsupported file format: {file_ext}")
        print("Supported formats: .csv, .json, .geojson")
        sys.exit(1)

    print(f"Found {len(mpas)} Marine Protected Areas")

    if args.limit:
        mpas = mpas[:args.limit]
        print(f"Limited to {len(mpas)} MPAs")

    if args.dry_run:
        print("\n[DRY RUN] Would insert the following MPAs:")
        for mpa in mpas[:5]:
            print(f"  - {mpa['name']} ({mpa['country']})")
        if len(mpas) > 5:
            print(f"  ... and {len(mpas) - 5} more")
        return

    # Connect to Supabase and insert
    print("\nConnecting to Supabase...")
    supabase = get_supabase_client()

    print("Inserting MPAs...")
    inserted = insert_mpas(supabase, mpas)

    print(f"\nDone! Inserted {inserted} Marine Protected Areas into Supabase.")


if __name__ == '__main__':
    main()
