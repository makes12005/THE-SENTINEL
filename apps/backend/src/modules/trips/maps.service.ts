const GOOGLE_GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export type GeocodedPlace = {
  name: string;
  lat: number;
  lng: number;
  formatted_address: string;
};

function getGoogleMapsApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw Object.assign(new Error('GOOGLE_MAPS_API_KEY is not configured'), {
      statusCode: 500,
      code: 'MAPS_API_KEY_MISSING',
    });
  }
  return key;
}

export async function geocodePlace(query: string): Promise<GeocodedPlace[]> {
  const key = getGoogleMapsApiKey();
  const params = new URLSearchParams({ address: query, key });
  const response = await fetch(`${GOOGLE_GEOCODE_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw Object.assign(new Error('Google Maps geocoding request failed'), {
      statusCode: 502,
      code: 'MAPS_GEOCODE_FAILED',
    });
  }

  const payload = await response.json() as any;
  if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw Object.assign(new Error(payload.error_message ?? `Google Maps returned ${payload.status}`), {
      statusCode: 502,
      code: 'MAPS_GEOCODE_FAILED',
    });
  }

  return (payload.results ?? []).map((result: any) => ({
    name: result.address_components?.[0]?.long_name ?? result.formatted_address,
    lat: Number(result.geometry?.location?.lat),
    lng: Number(result.geometry?.location?.lng),
    formatted_address: result.formatted_address,
  }));
}

export async function reverseGeocodePlace(lat: number, lng: number): Promise<GeocodedPlace | null> {
  const key = getGoogleMapsApiKey();
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key });
  const response = await fetch(`${GOOGLE_GEOCODE_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw Object.assign(new Error('Google Maps reverse geocoding request failed'), {
      statusCode: 502,
      code: 'MAPS_REVERSE_GEOCODE_FAILED',
    });
  }

  const payload = await response.json() as any;
  if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw Object.assign(new Error(payload.error_message ?? `Google Maps returned ${payload.status}`), {
      statusCode: 502,
      code: 'MAPS_REVERSE_GEOCODE_FAILED',
    });
  }

  const first = payload.results?.[0];
  if (!first) return null;
  return {
    name: first.address_components?.[0]?.long_name ?? first.formatted_address,
    lat,
    lng,
    formatted_address: first.formatted_address,
  };
}
