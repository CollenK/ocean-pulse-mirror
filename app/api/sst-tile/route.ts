import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for Copernicus Marine Service SST tiles.
 *
 * Uses the new Copernicus WMTS endpoint (the old nrt.cmems-du.eu
 * thredds endpoint was decommissioned in April 2024).
 *
 * Note: The WMTS endpoint supports CORS natively, so this proxy
 * is optional. It can be useful for server-side caching.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get('z');
  const x = searchParams.get('x');
  const y = searchParams.get('y');

  if (!z || !x || !y) {
    return NextResponse.json(
      { error: 'Missing z, x, y tile coordinate parameters' },
      { status: 400 },
    );
  }

  // Copernicus Marine WMTS endpoint (public, no auth required)
  const wmtsUrl = new URL('https://wmts.marine.copernicus.eu/teroWmts');
  wmtsUrl.searchParams.set('SERVICE', 'WMTS');
  wmtsUrl.searchParams.set('REQUEST', 'GetTile');
  wmtsUrl.searchParams.set(
    'LAYER',
    'SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2/analysed_sst',
  );
  wmtsUrl.searchParams.set('STYLE', 'cmap:thermal');
  wmtsUrl.searchParams.set('TILEMATRIXSET', 'EPSG:3857');
  wmtsUrl.searchParams.set('TILEMATRIX', z);
  wmtsUrl.searchParams.set('TILEROW', y);
  wmtsUrl.searchParams.set('TILECOL', x);
  wmtsUrl.searchParams.set('FORMAT', 'image/png');

  try {
    const response = await fetch(wmtsUrl.toString(), {
      headers: {
        Accept: 'image/png',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`Copernicus WMTS error: ${response.status} ${response.statusText}`);
      return new NextResponse(null, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('SST tile fetch error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
