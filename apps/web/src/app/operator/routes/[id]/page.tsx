'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
  const qc = useQueryClient();
  const [showStopEditor, setShowStopEditor] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [pickedPlace, setPickedPlace] = useState<PlaceResult | null>(null);
  const [stopName, setStopName] = useState('');

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
    setShowStopEditor(true);
  };

  const resetEditor = () => {
    setShowStopEditor(false);
    setEditingStop(null);
    setPickedPlace(null);
    setStopName('');
    setSearchText('');
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
      if (!stopName.trim()) {
        setStopName(place.shortLabel);
      }
      toast.success('Stop location selected from map.');
    } catch {
      toast.error('Could not name that map point.');
    }
  };

  const saveStop = () => {
    if (!pickedPlace) {
      toast.error('Select a stop by search or map first.');
      return;
    }

    const payload = {
      name: stopName.trim() || pickedPlace.shortLabel,
      sequence_number: editingStop?.sequence_number ?? nextSequence,
      latitude: pickedPlace.latitude,
      longitude: pickedPlace.longitude,
      trigger_radius_km: Number(editingStop?.trigger_radius_km ?? '10'),
    };

    if (editingStop) {
      updateStop.mutate({ stopId: editingStop.id, data: payload });
      return;
    }

    addStop.mutate(payload);
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
          Back to route builder
        </Link>

        <div className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-[#081120]/80 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.32em] text-[#7dd3fc]">Route Details</p>
            <h1 className="mt-3 text-3xl font-black text-white">{route.data?.name ?? 'Route'}</h1>
            <p className="mt-2 text-sm text-[#cbd5e1]">
              {route.data?.from_city} to {route.data?.to_city}
            </p>
          </div>
          <button
            onClick={openNewStop}
            className="rounded-2xl bg-[#f97316] px-5 py-3 text-sm font-extrabold text-white shadow-[0_18px_40px_rgba(249,115,22,0.25)]"
          >
            Add Stop
          </button>
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
                        <p className="mt-1 text-xs text-[#94a3b8]">Radius {stop.trigger_radius_km} km</p>
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
      </div>

      {showStopEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-[#081120] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#7dd3fc]">Stop Editor</p>
                <h2 className="mt-2 text-2xl font-black text-white">{editingStop ? 'Update stop' : 'Add a new stop'}</h2>
                <p className="mt-2 text-sm text-[#cbd5e1]">Search the place or tap the map. Coordinates stay hidden from the operator.</p>
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
                    <p className="mt-3 text-xs text-[#94a3b8]">Select a place from search or by tapping the map.</p>
                  )}
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
