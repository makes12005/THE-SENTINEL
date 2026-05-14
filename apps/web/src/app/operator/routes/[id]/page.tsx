'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { del, get, post, put } from '@/lib/api';
import type { MapStop } from '@/components/shared/RouteMap';

const RouteMap = dynamic(() => import('@/components/shared/RouteMap'), { ssr: false });

type Stop = {
  id: string;
  name: string;
  sequence_number: number;
  latitude: number;
  longitude: number;
  trigger_radius_km: string;
};

type RouteDetails = {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  stops: Stop[];
};

type PlaceResult = {
  label: string;
  shortLabel: string;
  latitude: number;
  longitude: number;
};

export default function RouteDetailsPage() {
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [showStopEditor, setShowStopEditor] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [pickedPlace, setPickedPlace] = useState<PlaceResult | null>(null);
  const [stopName, setStopName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showRouteEditor, setShowRouteEditor] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFromCity, setEditFromCity] = useState('');
  const [editToCity, setEditToCity] = useState('');

  const route = useQuery<RouteDetails>({
    queryKey: ['route-detail', routeId],
    queryFn: () => get(`/api/routes/${routeId}`),
    enabled: !!routeId,
  });

  const stopSearch = useQuery<PlaceResult[]>({
    queryKey: ['detail-stop-search', searchText],
    queryFn: () => searchPlaces(searchText),
    enabled: searchText.trim().length >= 2,
  });

  const stops = route.data?.stops ?? [];

  const addStop = useMutation({
    mutationFn: (data: any) => post(`/api/routes/${routeId}/stops`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      toast.success('Stop added');
      resetEditor();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to add stop'),
  });

  const updateStop = useMutation({
    mutationFn: ({ stopId, data }: { stopId: string; data: any }) => put(`/api/routes/${routeId}/stops/${stopId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      toast.success('Stop updated');
      resetEditor();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to update stop'),
  });

  const deleteStop = useMutation({
    mutationFn: (stopId: string) => del(`/api/routes/${routeId}/stops/${stopId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      toast.success('Stop deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to delete stop'),
  });

  const deleteRoute = useMutation({
    mutationFn: () => del(`/api/routes/${routeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted');
      router.push('/operator/routes');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to delete route'),
  });

  const updateRoute = useMutation({
    mutationFn: (data: any) => put(`/api/routes/${routeId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route updated');
      setShowRouteEditor(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to update route'),
  });

  const mapStops = useMemo<MapStop[]>(
    () =>
      stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequence_number: stop.sequence_number,
        trigger_radius_km: stop.trigger_radius_km,
      })),
    [stops]
  );

  const nextSequence = stops.length ? Math.max(...stops.map((stop) => stop.sequence_number)) + 1 : 1;

  const openNewStop = () => {
    setEditingStop(null);
    setPickedPlace(null);
    setStopName('');
    setSearchText('');
    setManualLat('');
    setManualLng('');
    setShowStopEditor(true);
  };

  const openEditStop = (stop: Stop) => {
    setEditingStop(stop);
    setPickedPlace({
      label: stop.name,
      shortLabel: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
    setStopName(stop.name);
    setSearchText(stop.name);
    setManualLat(String(stop.latitude));
    setManualLng(String(stop.longitude));
    setShowStopEditor(true);
  };

  const resetEditor = () => {
    setShowStopEditor(false);
    setEditingStop(null);
    setPickedPlace(null);
    setStopName('');
    setSearchText('');
    setManualLat('');
    setManualLng('');
  };

  const openRouteEditor = () => {
    setEditName(route.data?.name ?? '');
    setEditFromCity(route.data?.from_city ?? '');
    setEditToCity(route.data?.to_city ?? '');
    setShowRouteEditor(true);
  };

  const reorderStop = (stop: Stop, direction: -1 | 1) => {
    const sorted = [...stops].sort((a, b) => a.sequence_number - b.sequence_number);
    const index = sorted.findIndex((item) => item.id === stop.id);
    const target = sorted[index + direction];
    if (!target) return;

    updateStop.mutate({ stopId: stop.id, data: { sequence_number: target.sequence_number } });
    updateStop.mutate({ stopId: target.id, data: { sequence_number: stop.sequence_number } });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      const place = await reverseLookup(lat, lng);
      setPickedPlace(place);
      setManualLat(String(lat));
      setManualLng(String(lng));
      if (!stopName.trim()) {
        setStopName(place.shortLabel);
      }
      toast.success('Stop location selected from map.');
    } catch {
      setPickedPlace({ label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, shortLabel: `Point`, latitude: lat, longitude: lng });
      setManualLat(String(lat));
      setManualLng(String(lng));
      toast.success('Coordinates set from map click.');
    }
  };

  const applyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    setPickedPlace({
      label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      shortLabel: stopName.trim() || `Stop`,
      latitude: lat,
      longitude: lng,
    });
    toast.success('Manual coordinates applied.');
  };

  const saveStop = () => {
    const placeToUse = pickedPlace;
    if (!placeToUse) {
      toast.error('Select a stop by search, map click, or enter manual coordinates.');
      return;
    }

    const payload = {
      name: stopName.trim() || placeToUse.shortLabel,
      sequence_number: editingStop?.sequence_number ?? nextSequence,
      latitude: placeToUse.latitude,
      longitude: placeToUse.longitude,
      trigger_radius_km: Number(editingStop?.trigger_radius_km ?? '10'),
    };

    if (editingStop) {
      updateStop.mutate({ stopId: editingStop.id, data: payload });
      return;
    }

    addStop.mutate(payload);
  };

  const handleDeleteRoute = () => {
    if (confirm(`Delete route "${route.data?.name}"? This cannot be undone.`)) {
      deleteRoute.mutate();
    }
  };

  const handleSaveRoute = () => {
    if (!editName.trim()) {
      toast.error('Route name is required.');
      return;
    }
    if (!editFromCity.trim() || !editToCity.trim()) {
      toast.error('Both From and To cities are required.');
      return;
    }
    updateRoute.mutate({
      name: editName.trim(),
      from_city: editFromCity.trim(),
      to_city: editToCity.trim(),
      is_published: false,
      source: 'scratch',
    });
  };

  return (
    <div
      className="min-h-screen px-6 py-8 text-[#F8FAFC] lg:px-10"
      style={{
        fontFamily: 'Manrope, sans-serif',
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 26%), linear-gradient(160deg, #07111f 0%, #0f172a 55%, #111827 100%)',
      }}
    >
      <div className="mx-auto max-w-[1260px] space-y-6">
        <Link href="/operator/routes" className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#dbeafe] transition hover:border-white/20 hover:bg-white/10">
          Back to routes
        </Link>

        <div className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-[#081120]/80 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.32em] text-[#7dd3fc]">Route Details</p>
            <h1 className="mt-3 text-3xl font-black text-white">{route.data?.name ?? 'Route'}</h1>
            <p className="mt-2 text-sm text-[#cbd5e1]">
              {route.data?.from_city} to {route.data?.to_city}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openRouteEditor}
              className="rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-5 py-3 text-sm font-extrabold text-[#7dd3fc]"
            >
              Edit Route
            </button>
            <button
              onClick={handleDeleteRoute}
              disabled={deleteRoute.isPending}
              className="rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-5 py-3 text-sm font-extrabold text-[#fca5a5] disabled:opacity-60"
            >
              {deleteRoute.isPending ? 'Deleting...' : 'Delete Route'}
            </button>
            <button
              onClick={openNewStop}
              className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-extrabold text-white shadow-[0_18px_40px_rgba(249,115,22,0.25)]"
            >
              Add Stop
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#081120]/80 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <RouteMap stops={mapStops} height="480px" readonly />
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#081120]/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#7dd3fc]">Stop List</p>
                <p className="mt-1 text-sm text-[#94a3b8]">{stops.length} stops in order</p>
              </div>
            </div>

            {stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center">
                <p className="text-base font-bold text-white">No stops yet</p>
                <p className="mt-2 text-sm text-[#94a3b8]">Add the first stop by searching a place name or tapping the map.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, index) => (
                  <div key={stop.id} className="rounded-[24px] border border-white/10 bg-[#0a1627] px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-sm font-black text-white">
                        {stop.sequence_number}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-white">{stop.name}</p>
                        <p className="mt-1 text-xs text-[#94a3b8]">
                          Radius {stop.trigger_radius_km} km &middot; {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={index === 0}
                          onClick={() => reorderStop(stop, -1)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#e2e8f0] disabled:opacity-30"
                        >
                          Move up
                        </button>
                        <button
                          disabled={index === stops.length - 1}
                          onClick={() => reorderStop(stop, 1)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#e2e8f0] disabled:opacity-30"
                        >
                          Move down
                        </button>
                        <button
                          onClick={() => openEditStop(stop)}
                          className="rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-3 py-2 text-xs font-bold text-[#7dd3fc]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this stop?')) deleteStop.mutate(stop.id);
                          }}
                          className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-3 py-2 text-xs font-bold text-[#fca5a5]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showRouteEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#081120] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#7dd3fc]">Edit Route</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Update route details</h2>
                </div>
                <button
                  onClick={() => setShowRouteEditor(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#e2e8f0]"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#94a3b8]">Route Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#94a3b8]">From City</label>
                    <input
                      value={editFromCity}
                      onChange={(e) => setEditFromCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#94a3b8]">To City</label>
                    <input
                      value={editToCity}
                      onChange={(e) => setEditToCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRouteEditor(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-[#e2e8f0]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRoute}
                    disabled={updateRoute.isPending}
                    className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                  >
                    {updateRoute.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStopEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-[#081120] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#7dd3fc]">Stop Editor</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{editingStop ? 'Update stop' : 'Add a new stop'}</h2>
                  <p className="mt-2 text-sm text-[#cbd5e1]">Search the place, tap the map, or enter coordinates manually.</p>
                </div>
                <button
                  onClick={resetEditor}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#e2e8f0]"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                  <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#94a3b8]">Search stop name</label>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search village, landmark, or bus stand"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                  />
                  <div className="space-y-2">
                    {(stopSearch.data ?? []).map((place) => (
                      <button
                        key={`${place.shortLabel}-${place.latitude}-${place.longitude}`}
                        onClick={() => {
                          setPickedPlace(place);
                          setStopName(place.shortLabel);
                          setManualLat(String(place.latitude));
                          setManualLng(String(place.longitude));
                        }}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:border-[#38bdf8]/35 hover:bg-[#0f2036]"
                      >
                        <div>
                          <p className="text-sm font-extrabold text-white">{place.shortLabel}</p>
                          <p className="mt-1 text-xs text-[#94a3b8]">{place.label}</p>
                        </div>
                        <span className="rounded-full bg-[#38bdf8]/10 px-3 py-1 text-xs font-bold text-[#7dd3fc]">Use</span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[#091321] p-4">
                    <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#94a3b8]">Stop display name</label>
                    <input
                      value={stopName}
                      onChange={(event) => setStopName(event.target.value)}
                      placeholder="Auto-filled after you select a place"
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                    />
                    {pickedPlace ? (
                      <p className="mt-3 text-xs text-[#94a3b8]">Selected place: {pickedPlace.label}</p>
                    ) : (
                      <p className="mt-3 text-xs text-[#94a3b8]">Select a place from search, by tapping the map, or enter coordinates below.</p>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-[#38bdf8]/15 bg-[#38bdf8]/[0.04] p-4">
                    <label className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#7dd3fc]">Manual Coordinates</label>
                    <p className="mt-1 text-[10px] text-[#94a3b8]">Enter latitude and longitude directly if search/map doesn't work.</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="e.g. 21.1702"
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="e.g. 72.8311"
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:border-[#38bdf8]/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={applyManualCoords}
                      disabled={!manualLat.trim() || !manualLng.trim()}
                      className="mt-3 w-full rounded-2xl bg-[#38bdf8]/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#7dd3fc] disabled:opacity-40"
                    >
                      Apply Coordinates
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetEditor}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-[#e2e8f0]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveStop}
                      disabled={addStop.isPending || updateStop.isPending}
                      className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      {editingStop ? 'Save changes' : 'Add stop'}
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#081321] p-4">
                  <RouteMap
                    stops={
                      pickedPlace
                        ? [
                            ...mapStops,
                            {
                              id: editingStop?.id ?? 'preview',
                              name: stopName || pickedPlace.shortLabel,
                              latitude: pickedPlace.latitude,
                              longitude: pickedPlace.longitude,
                              sequence_number: editingStop?.sequence_number ?? nextSequence,
                              trigger_radius_km: editingStop?.trigger_radius_km ?? '10',
                            },
                          ]
                        : mapStops
                    }
                    onMapClick={handleMapClick}
                    height="560px"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function searchPlaces(query: string) {
  const response = await fetch(`/api/geocode/search?query=${encodeURIComponent(query)}&kind=any`);
  if (!response.ok) {
    throw new Error('Could not search places right now.');
  }
  return (await response.json()) as PlaceResult[];
}

async function reverseLookup(lat: number, lng: number) {
  const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
  if (!response.ok) {
    throw new Error('Could not resolve this map point.');
  }
  return (await response.json()) as PlaceResult;
}
