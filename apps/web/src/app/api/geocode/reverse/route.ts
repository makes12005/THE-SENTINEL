import { NextRequest, NextResponse } from 'next/server';

type ReverseResult = {
  display_name: string;
  name?: string;
  address?: {
    attraction?: string;
    road?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
  };
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'BusAlert Route Builder/1.0',
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'reverse lookup unavailable' }, { status: 502 });
  }

  const result = (await response.json()) as ReverseResult;

  const shortLabel =
    result.name ??
    result.address?.attraction ??
    result.address?.road ??
    result.address?.suburb ??
    result.address?.village ??
    result.address?.town ??
    result.address?.city ??
    result.display_name.split(',')[0]?.trim() ??
    'Selected stop';

  return NextResponse.json({
    label: result.display_name,
    shortLabel,
    latitude: lat,
    longitude: lng,
  });
}
