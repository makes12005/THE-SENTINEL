import { NextRequest, NextResponse } from 'next/server';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
  };
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  const kind = request.nextUrl.searchParams.get('kind') === 'city' ? 'city' : 'any';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '6');

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(Math.min(Math.max(limit, 1), 8)),
    countrycodes: 'in',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'BusAlert Route Builder/1.0',
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'place search unavailable' }, { status: 502 });
  }

  const results = (await response.json()) as NominatimResult[];

  return NextResponse.json(
    results.map((item) => {
      const locality =
        item.address?.city ??
        item.address?.town ??
        item.address?.village ??
        item.address?.county ??
        item.name ??
        item.display_name.split(',')[0]?.trim() ??
        query;

      return {
        label: item.display_name,
        shortLabel: locality,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      };
    })
  );
}
