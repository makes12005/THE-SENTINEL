'use client';

/**
 * RouteMap — interactive stop-picker using OpenStreetMap + Leaflet
 *
 * Dynamically imported to avoid SSR issues with Leaflet.
 * Usage:
 *   import RouteMap from '@/components/shared/RouteMap';
 *   <RouteMap stops={stops} onMapClick={handleMapClick} />
 */

import { useEffect, useRef } from 'react';

export interface MapStop {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence_number: number;
  trigger_radius_km?: string | number;
}

interface RouteMapProps {
  stops: MapStop[];
  onMapClick?: (lat: number, lng: number) => void;
  /** Height of the map container */
  height?: string;
  /** Center override — defaults to centroid of stops or India center */
  center?: [number, number];
  zoom?: number;
  readonly?: boolean;
}

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const PALETTE = {
  line: '#6C63FF',
  markerBg: '#0B3C5D',
  markerBorder: '#6C63FF',
  markerText: '#F1F5F9',
  clickMarker: '#FF7A00',
  radius: 'rgba(108,99,255,0.12)',
};

function centroid(stops: MapStop[]): [number, number] {
  if (!stops.length) return INDIA_CENTER;
  const lat = stops.reduce((s, p) => s + p.latitude, 0) / stops.length;
  const lng = stops.reduce((s, p) => s + p.longitude, 0) / stops.length;
  return [lat, lng];
}

export default function RouteMap({
  stops,
  onMapClick,
  height = '380px',
  center,
  zoom = 10,
  readonly = false,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Bootstrap Leaflet once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (leafletMapRef.current) return; // already initialized

    (async () => {
      // Dynamic import — avoids SSR crash
      const L = (await import('leaflet')).default;

      // Fix default marker icon path broken by Webpack
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) return;

      const initialCenter = center ?? centroid(stops);
      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      // Click handler to pick new stop location
      if (!readonly && onMapClick) {
        map.on('click', (e: any) => {
          onMapClick(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
        });
      }

      renderStops(L, map);
    })();

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render stops whenever they change
  useEffect(() => {
    if (!leafletMapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      renderStops(L, leafletMapRef.current);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  function renderStops(L: any, map: any) {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();
    if (!stops.length) return;

    const sorted = [...stops].sort((a, b) => a.sequence_number - b.sequence_number);

    // Polyline
    const latlngs = sorted.map((s) => [s.latitude, s.longitude]);
    L.polyline(latlngs, {
      color: PALETTE.line,
      weight: 3,
      opacity: 0.85,
      dashArray: '6 4',
    }).addTo(layerGroupRef.current);

    // Markers
    sorted.forEach((stop, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === sorted.length - 1;
      const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : PALETTE.markerBg;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};border:2.5px solid ${PALETTE.markerBorder};
            display:flex;align-items:center;justify-content:center;
            color:${PALETTE.markerText};font-size:11px;font-weight:800;
            font-family:Manrope,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.45);
          ">${stop.sequence_number}</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(layerGroupRef.current);
      marker.bindPopup(
        `<div style="font-family:Manrope,sans-serif;font-size:12px;line-height:1.6;">
          <strong style="color:#0B3C5D;">#${stop.sequence_number} — ${stop.name}</strong><br/>
          <span style="color:#64748b;">${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}</span><br/>
          <span style="color:#6C63FF;">Radius: ${stop.trigger_radius_km ?? 10} km</span>
        </div>`,
        { maxWidth: 220 }
      );
    });

    // Auto-fit bounds
    try {
      const bounds = L.latLngBounds(latlngs as any);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch {}
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}
      />
      {!readonly && onMapClick && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.88)',
            color: '#94a3b8',
            fontSize: 11,
            fontFamily: 'Manrope,sans-serif',
            padding: '5px 14px',
            borderRadius: 20,
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Click on map to set stop location
        </div>
      )}
    </div>
  );
}
