'use client';

import { useEffect, useRef, useState } from 'react';

type PlacePoint = {
  name: string;
  lat: number;
  lng: number;
  formatted_address?: string;
};

type RouteStopPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
};

declare global {
  interface Window {
    google?: any;
  }
}

let googleMapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-busalert-google-maps="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.busalertGoogleMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

export function useGoogleMapsReady(apiKey: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.');
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Google Maps failed to load'));
  }, [apiKey]);

  return { ready, error };
}

type Props = {
  apiKey: string;
  fromPlace: PlacePoint | null;
  toPlace: PlacePoint | null;
  stops: RouteStopPoint[];
  clickToAdd?: boolean;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
};

export default function GoogleRouteMap({
  apiKey,
  fromPlace,
  toPlace,
  stops,
  clickToAdd = false,
  height = 520,
  onMapClick,
}: Props) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionsRendererRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const { ready, error } = useGoogleMapsReady(apiKey);

  useEffect(() => {
    if (!ready || !mapElementRef.current || mapRef.current) return;

    mapRef.current = new window.google.maps.Map(mapElementRef.current, {
      center: { lat: 22.9734, lng: 78.6569 },
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#0f9ae8',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });
    directionsRendererRef.current.setMap(mapRef.current);
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (clickToAdd && onMapClick) {
      clickListenerRef.current = mapRef.current.addListener('click', (event: any) => {
        onMapClick(event.latLng.lat(), event.latLng.lng());
      });
    }
  }, [clickToAdd, onMapClick, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    const points: Array<{ place: PlacePoint; label: string; color: string }> = [];
    if (fromPlace) points.push({ place: fromPlace, label: 'A', color: '#16a34a' });
    stops.forEach((stop, index) => {
      points.push({
        place: { name: stop.name, lat: stop.lat, lng: stop.lng },
        label: String(index + 1),
        color: '#0f9ae8',
      });
    });
    if (toPlace) points.push({ place: toPlace, label: 'B', color: '#dc2626' });

    points.forEach(({ place, label, color }) => {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        label,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });

    if (fromPlace && toPlace) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: fromPlace.lat, lng: fromPlace.lng },
          destination: { lat: toPlace.lat, lng: toPlace.lng },
          waypoints: stops.map((stop) => ({
            location: { lat: stop.lat, lng: stop.lng },
            stopover: true,
          })),
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        },
        (result: any, status: string) => {
          if (status === 'OK' && result) {
            directionsRendererRef.current?.setDirections(result);
            mapRef.current.fitBounds(result.routes[0].bounds);
          } else if (!bounds.isEmpty()) {
            directionsRendererRef.current?.setDirections({ routes: [] });
            mapRef.current.fitBounds(bounds);
          }
        }
      );
    } else {
      directionsRendererRef.current?.setDirections({ routes: [] });
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [fromPlace, ready, stops, toPlace]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-[28px] border border-[#fecaca] bg-[#fff1f2] px-6 py-10 text-sm font-semibold text-[#9f1239]">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mapElementRef}
      className="w-full overflow-hidden rounded-[28px] border border-[#dbe7f3] bg-[#edf6ff]"
      style={{ height }}
    />
  );
}

