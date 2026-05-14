'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import GoogleRouteMap, { useGoogleMapsReady } from '@/components/google-route-map';
import { del, get, post } from '@/lib/api';

type PlaceResult = {
  name: string;
  lat: number;
  lng: number;
  formatted_address: string;
};

type RouteStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
  source: 'search' | 'map' | 'library' | 'popular';
};

type LibraryEntry = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  captured_by_name: string;
  agency_name: string;
  use_count: number;
  verified: boolean;
  created_at: string;
};

type PopularRoute = {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  stops: Array<{ name: string; lat: number; lng: number; sequence: number }>;
  use_count: number;
};

type RouteListItem = {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  is_active: boolean;
  stop_count: number;
  created_at: string;
  created_by_name: string | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default function OperatorRoutesPage() {
  const qc = useQueryClient();
  const { ready: mapsReady } = useGoogleMapsReady(API_KEY);
  const [tab, setTab] = useState<'create' | 'list'>('list');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [routeName, setRouteName] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromPlace, setFromPlace] = useState<PlaceResult | null>(null);
  const [toPlace, setToPlace] = useState<PlaceResult | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [stopSearch, setStopSearch] = useState('');
  const [publishRoute, setPublishRoute] = useState(false);
  const [clickToAdd, setClickToAdd] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPopular, setShowPopular] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<Array<{ description: string }>>([]);
  const [toSuggestions, setToSuggestions] = useState<Array<{ description: string }>>([]);
  const [stopSuggestions, setStopSuggestions] = useState<Array<{ description: string }>>([]);
  const [routeSearch, setRouteSearch] = useState('');

  const routesList = useQuery<RouteListItem[]>({
    queryKey: ['routes'],
    queryFn: () => get<RouteListItem[]>('/api/routes'),
  });

  const libraryQuery = useQuery<LibraryEntry[]>({
    queryKey: ['geo-library', 'all'],
    queryFn: () => get('/api/geo-library'),
  });

  const popularRoutesQuery = useQuery<PopularRoute[]>({
    queryKey: ['popular-routes'],
    queryFn: () => get('/api/popular-routes'),
  });

  useEffect(() => {
    if (fromPlace && toPlace && !routeName.trim()) {
      setRouteName(`${fromPlace.name} to ${toPlace.name}`);
    }
  }, [fromPlace, routeName, toPlace]);

  useEffect(() => {
    if (!mapsReady || !window.google?.maps?.places) return;
    const service = new window.google.maps.places.AutocompleteService();

    const loadPredictions = (value: string, setter: (items: Array<{ description: string }>) => void) => {
      if (value.trim().length < 2) {
        setter([]);
        return;
      }
      service.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'in' },
        },
        (predictions: any[]) => setter((predictions ?? []).map((prediction) => ({ description: prediction.description })))
      );
    };

    const timeout = window.setTimeout(() => {
      loadPredictions(fromInput, setFromSuggestions);
      loadPredictions(toInput, setToSuggestions);
      loadPredictions(stopSearch, setStopSuggestions);
    }, 160);

    return () => window.clearTimeout(timeout);
  }, [fromInput, mapsReady, stopSearch, toInput]);

  const orderedStops = useMemo(
    () => stops.map((stop, index) => ({ ...stop, sequence: index + 1 })),
    [stops]
  );

  const deleteRouteMut = useMutation({
    mutationFn: (id: string) => del(`/api/routes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to delete route'),
  });

  const saveRoute = useMutation({
    mutationFn: async () => {
      if (!fromPlace || !toPlace) {
        throw new Error('Select both start and destination cities.');
      }

      const created = await post<{ id: string }>('/api/routes', {
        name: routeName.trim() || `${fromPlace.name} to ${toPlace.name}`,
        from_city: fromPlace.name,
        to_city: toPlace.name,
        is_published: publishRoute,
        source: stops.some((stop) => stop.source === 'popular')
          ? 'popular'
          : stops.some((stop) => stop.source === 'library')
          ? 'library'
          : 'scratch',
      });

      const fullStops = [
        { name: fromPlace.name, lat: fromPlace.lat, lng: fromPlace.lng, sequence: 1 },
        ...orderedStops.map((stop, index) => ({
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          sequence: index + 2,
        })),
        { name: toPlace.name, lat: toPlace.lat, lng: toPlace.lng, sequence: orderedStops.length + 2 },
      ];

      for (const stop of fullStops) {
        await post(`/api/routes/${created.id}/stops`, {
          name: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequence_number: stop.sequence,
          trigger_radius_km: 10,
        });
      }

      if (publishRoute) {
        await post('/api/popular-routes', {
          name: routeName.trim() || `${fromPlace.name} to ${toPlace.name}`,
          from_city: fromPlace.name,
          to_city: toPlace.name,
          stops: fullStops.map((stop) => ({
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            sequence: stop.sequence,
          })),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['popular-routes'] });
      toast.success('Route saved!');
      resetBuilder();
      setTab('list');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? error?.message ?? 'Failed to save route');
    },
  });

  const selectPrediction = async (
    description: string,
    kind: 'from' | 'to' | 'stop'
  ) => {
    const results = await get<PlaceResult[]>('/api/routes/search-place', { q: description });
    const first = results[0];
    if (!first) {
      toast.error('Place not found.');
      return;
    }

    if (kind === 'from') {
      setFromInput(description);
      setFromPlace(first);
      setFromSuggestions([]);
      return;
    }
    if (kind === 'to') {
      setToInput(description);
      setToPlace(first);
      setToSuggestions([]);
      return;
    }

    setStops((current) => [...current, { id: crypto.randomUUID(), name: first.name, lat: first.lat, lng: first.lng, sequence: current.length + 1, source: 'search' }]);
    setStopSearch('');
    setStopSuggestions([]);
  };

  const addMapStop = async (lat: number, lng: number) => {
    try {
      const place = await get<PlaceResult | null>('/api/routes/reverse-geocode', { lat, lng });
      if (!place) {
        toast.error('Could not name that map point.');
        return;
      }
      setStops((current) => [...current, { id: crypto.randomUUID(), name: place.name, lat: place.lat, lng: place.lng, sequence: current.length + 1, source: 'map' }]);
      toast.success(`Added ${place.name}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message ?? 'Could not add that point.');
    }
  };

  const loadPopularRoute = async (route: PopularRoute) => {
    const [from] = await get<PlaceResult[]>('/api/routes/search-place', { q: route.from_city });
    const [to] = await get<PlaceResult[]>('/api/routes/search-place', { q: route.to_city });
    if (!from || !to) {
      toast.error('Could not load the selected route cities.');
      return;
    }
    setFromInput(route.from_city);
    setToInput(route.to_city);
    setFromPlace(from);
    setToPlace(to);
    setRouteName(route.name);
    setStops(
      route.stops
        .sort((a, b) => a.sequence - b.sequence)
        .slice(1, Math.max(route.stops.length - 1, 1))
        .map((stop, index) => ({
          id: crypto.randomUUID(),
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          sequence: index + 1,
          source: 'popular' as const,
        }))
    );
    setShowPopular(false);
    toast.success('Popular route loaded. You can edit the stops before saving.');
  };

  const resetBuilder = () => {
    setStep(1);
    setRouteName('');
    setFromInput('');
    setToInput('');
    setFromPlace(null);
    setToPlace(null);
    setStops([]);
    setStopSearch('');
    setPublishRoute(false);
    setClickToAdd(false);
    setShowLibrary(false);
    setShowPopular(false);
  };

  const moveStop = (fromId: string, toId: string) => {
    const sourceIndex = orderedStops.findIndex((stop) => stop.id === fromId);
    const targetIndex = orderedStops.findIndex((stop) => stop.id === toId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const updated = [...orderedStops];
    const [item] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, item);
    setStops(updated);
  };

  const fullStopList = [
    ...(fromPlace ? [{ id: 'from', name: fromPlace.name, lat: fromPlace.lat, lng: fromPlace.lng, sequence: 1 }] : []),
    ...orderedStops.map((stop, index) => ({ ...stop, sequence: index + 2 })),
    ...(toPlace ? [{ id: 'to', name: toPlace.name, lat: toPlace.lat, lng: toPlace.lng, sequence: orderedStops.length + 2 }] : []),
  ];

  const filteredRoutes = (routesList.data ?? []).filter((r) => {
    if (!routeSearch) return true;
    const q = routeSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.from_city?.toLowerCase().includes(q) ||
      r.to_city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f3f8fc] px-6 py-8 text-[#102132]">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#0f9ae8]">Routes</p>
            <h1 className="mt-2 text-4xl font-black">Manage Routes</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#526579]">
              Create, edit, and delete routes. Build with Google Maps, pull shared coordinates, and publish reusable routes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              <button
                onClick={() => setTab('list')}
                className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition ${tab === 'list' ? 'bg-[#0f9ae8] text-white' : 'text-[#526579] hover:text-[#102132]'}`}
              >
                My Routes
              </button>
              <button
                onClick={() => { setTab('create'); resetBuilder(); }}
                className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition ${tab === 'create' ? 'bg-[#0f9ae8] text-white' : 'text-[#526579] hover:text-[#102132]'}`}
              >
                Create Route
              </button>
            </div>
          </div>
        </div>

        {tab === 'list' && (
          <section className="rounded-[36px] bg-white p-8 shadow-[0_24px_80px_rgba(9,33,56,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">My Routes</h2>
                <p className="text-sm text-[#526579]">{filteredRoutes.length} routes in your agency</p>
              </div>
              <div className="relative w-72">
                <input
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Search routes..."
                  className="w-full rounded-full border border-[#d8e5f1] bg-[#f7fbff] px-5 py-3 text-sm font-semibold outline-none focus:border-[#0f9ae8]/50"
                />
              </div>
            </div>

            {routesList.isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-[24px] border border-[#d8e5f1] bg-[#f7fbff] px-5 py-5">
                    <div className="h-4 w-1/3 rounded-full bg-[#e5edf5]" />
                    <div className="mt-3 h-3 w-1/5 rounded-full bg-[#e5edf5]" />
                  </div>
                ))}
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d8e5f1] bg-[#f7fbff] px-5 py-16 text-center">
                <p className="text-xl font-black text-[#102132]">No routes yet</p>
                <p className="mt-2 text-sm text-[#526579]">Create your first route to get started.</p>
                <button
                  onClick={() => { setTab('create'); resetBuilder(); }}
                  className="mt-6 rounded-full bg-[#0f9ae8] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white"
                >
                  Create Route
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRoutes.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 rounded-[24px] border border-[#d8e5f1] bg-[#f7fbff] px-5 py-5 transition hover:border-[#0f9ae8]/30 hover:shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f9ae8]/10 text-sm font-black text-[#0f9ae8]">
                      {r.stop_count}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#102132]">{r.name}</p>
                      <p className="mt-1 text-xs text-[#526579]">
                        {r.from_city} → {r.to_city} &middot; {r.stop_count} stops
                        {r.created_by_name && <span> &middot; Created by {r.created_by_name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/operator/routes/${r.id}`}
                        className="rounded-full bg-[#0f9ae8]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#0f9ae8] hover:bg-[#0f9ae8] hover:text-white transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`Delete route "${r.name}"? This cannot be undone.`)) deleteRouteMut.mutate(r.id);
                        }}
                        disabled={deleteRouteMut.isPending}
                        className="rounded-full bg-[#ffe1e1] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#b42318] hover:bg-[#b42318] hover:text-white transition disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'create' && (
          <>
            <div className="mb-6 flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
              {[1, 2, 3].map((item) => (
                <div key={item} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${step >= item ? 'bg-[#0f9ae8] text-white' : 'bg-[#e5edf5] text-[#526579]'}`}>
                  {item}
                </div>
              ))}
            </div>

            {step === 1 && (
              <section className="rounded-[36px] bg-white p-8 shadow-[0_24px_80px_rgba(9,33,56,0.08)]">
                <div className="grid gap-6 lg:grid-cols-2">
                  <AutocompleteField
                    label="From city"
                    value={fromInput}
                    suggestions={fromSuggestions}
                    onChange={setFromInput}
                    onPick={(description) => selectPrediction(description, 'from')}
                  />
                  <AutocompleteField
                    label="To city"
                    value={toInput}
                    suggestions={toSuggestions}
                    onChange={setToInput}
                    onPick={(description) => selectPrediction(description, 'to')}
                  />
                </div>

                {(fromPlace || toPlace) && (
                  <div className="mt-8">
                    <GoogleRouteMap apiKey={API_KEY} fromPlace={fromPlace} toPlace={toPlace} stops={[]} height={420} />
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => {
                      if (!fromPlace || !toPlace) {
                        toast.error('Select both cities first.');
                        return;
                      }
                      setStep(2);
                    }}
                    className="rounded-full bg-[#0f9ae8] px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-white"
                  >
                    Next
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
                <div className="rounded-[36px] bg-white p-6 shadow-[0_24px_80px_rgba(9,33,56,0.08)]">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black">Add Stops</h2>
                      <p className="text-sm text-[#526579]">Search, tap the map, pull from the GPS library, or load a shared route.</p>
                    </div>
                    <button
                      onClick={() => setClickToAdd((current) => !current)}
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${clickToAdd ? 'bg-[#102132] text-white' : 'bg-[#e5edf5] text-[#102132]'}`}
                    >
                      {clickToAdd ? 'Click to add: On' : 'Click to add: Off'}
                    </button>
                  </div>

                  <AutocompleteField
                    label="Search by stop name"
                    value={stopSearch}
                    suggestions={stopSuggestions}
                    onChange={setStopSearch}
                    onPick={(description) => selectPrediction(description, 'stop')}
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => setShowLibrary(true)} className="rounded-full border border-[#d8e5f1] px-4 py-2 text-sm font-bold text-[#102132]">
                      From Library
                    </button>
                    <button onClick={() => setShowPopular(true)} className="rounded-full border border-[#d8e5f1] px-4 py-2 text-sm font-bold text-[#102132]">
                      Load Popular Route
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {orderedStops.length === 0 && (
                      <div className="rounded-[24px] border border-dashed border-[#d8e5f1] bg-[#f7fbff] px-4 py-6 text-sm text-[#526579]">
                        No stops yet. Search above, turn on map click mode, or pull from the shared library.
                      </div>
                    )}
                    {orderedStops.map((stop, index) => (
                      <div
                        key={stop.id}
                        draggable
                        onDragStart={() => setDraggingId(stop.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggingId) moveStop(draggingId, stop.id);
                          setDraggingId(null);
                        }}
                        className="flex items-center gap-3 rounded-[24px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-4"
                      >
                        <div className="text-[#526579]">::</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f9ae8] text-sm font-black text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">{stop.name}</div>
                          <div className="text-xs text-[#526579] capitalize">{stop.source} stop</div>
                        </div>
                        <button
                          onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))}
                          className="rounded-full bg-[#ffe1e1] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#b42318]"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-between">
                    <button onClick={() => setStep(1)} className="rounded-full border border-[#d8e5f1] px-6 py-3 text-sm font-black uppercase tracking-[0.16em]">
                      Back
                    </button>
                    <button onClick={() => setStep(3)} className="rounded-full bg-[#0f9ae8] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white">
                      Review
                    </button>
                  </div>
                </div>

                <GoogleRouteMap
                  apiKey={API_KEY}
                  fromPlace={fromPlace}
                  toPlace={toPlace}
                  stops={orderedStops}
                  clickToAdd={clickToAdd}
                  onMapClick={addMapStop}
                  height={760}
                />
              </section>
            )}

            {step === 3 && (
              <section className="grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
                <div className="rounded-[36px] bg-white p-6 shadow-[0_24px_80px_rgba(9,33,56,0.08)]">
                  <h2 className="text-2xl font-black">Review & Save</h2>
                  <div className="mt-5">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#526579]">Route name</label>
                    <input
                      value={routeName}
                      onChange={(event) => setRouteName(event.target.value)}
                      className="w-full rounded-[22px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-3 text-sm font-semibold outline-none"
                    />
                  </div>
                  <div className="mt-5 rounded-[24px] bg-[#f7fbff] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#526579]">From {'->'} To</div>
                    <div className="mt-2 text-sm font-black">{fromPlace?.name} {'->'} {toPlace?.name}</div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {fullStopList.map((stop) => (
                      <div key={stop.id} className="flex items-center gap-3 rounded-[20px] border border-[#d8e5f1] px-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#102132] text-xs font-black text-white">
                          {stop.sequence}
                        </div>
                        <div className="text-sm font-semibold">{stop.name}</div>
                      </div>
                    ))}
                  </div>
                  <label className="mt-5 flex items-center gap-3 rounded-[20px] bg-[#f7fbff] px-4 py-4">
                    <input type="checkbox" checked={publishRoute} onChange={(event) => setPublishRoute(event.target.checked)} />
                    <div>
                      <div className="text-sm font-black">Publish this route</div>
                      <div className="text-xs text-[#526579]">Share it with all agencies as a popular route draft.</div>
                    </div>
                  </label>
                  <div className="mt-6 flex justify-between">
                    <button onClick={() => setStep(2)} className="rounded-full border border-[#d8e5f1] px-6 py-3 text-sm font-black uppercase tracking-[0.16em]">
                      Back
                    </button>
                    <button
                      onClick={() => saveRoute.mutate()}
                      disabled={saveRoute.isPending}
                      className="rounded-full bg-[#16a34a] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"
                    >
                      {saveRoute.isPending ? 'Saving...' : 'Save Route'}
                    </button>
                  </div>
                </div>

                <GoogleRouteMap apiKey={API_KEY} fromPlace={fromPlace} toPlace={toPlace} stops={orderedStops} height={760} />
              </section>
            )}
          </>
        )}
      </div>

      {showLibrary && (
        <SelectionModal title="GPS Library" onClose={() => setShowLibrary(false)}>
          {(libraryQuery.data ?? []).map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                setStops((current) => [...current, { id: crypto.randomUUID(), name: entry.name, lat: entry.latitude, lng: entry.longitude, sequence: current.length + 1, source: 'library' }]);
                setShowLibrary(false);
              }}
              className="w-full rounded-[22px] border border-[#d8e5f1] px-4 py-4 text-left"
            >
              <div className="text-sm font-black">{entry.name}</div>
              <div className="mt-1 text-xs text-[#526579]">
                Captured by {entry.captured_by_name} &middot; {entry.agency_name} &middot; Used {entry.use_count} times
              </div>
            </button>
          ))}
        </SelectionModal>
      )}

      {showPopular && (
        <SelectionModal title="Popular Routes" onClose={() => setShowPopular(false)}>
          {(popularRoutesQuery.data ?? []).map((route) => (
            <button
              key={route.id}
              onClick={() => {
                post(`/api/popular-routes/${route.id}/use`).catch(() => undefined);
                void loadPopularRoute(route);
              }}
              className="w-full rounded-[22px] border border-[#d8e5f1] px-4 py-4 text-left"
            >
              <div className="text-sm font-black">{route.name}</div>
              <div className="mt-1 text-xs text-[#526579]">
                {route.from_city} {'->'} {route.to_city} &middot; {route.stops.length} stops &middot; Used {route.use_count} times
              </div>
            </button>
          ))}
        </SelectionModal>
      )}
    </div>
  );
}

function AutocompleteField({
  label,
  value,
  suggestions,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  suggestions: Array<{ description: string }>;
  onChange: (value: string) => void;
  onPick: (description: string) => void;
}) {
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#526579]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[24px] border border-[#d8e5f1] bg-[#f7fbff] px-5 py-4 text-sm font-semibold outline-none"
        placeholder="Search a city or place"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-[22px] border border-[#d8e5f1] bg-white p-2 shadow-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.description}
              onClick={() => onPick(suggestion.description)}
              className="w-full rounded-[18px] px-3 py-3 text-left text-sm hover:bg-[#f3f8fc]"
            >
              {suggestion.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectionModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09121b]/55 px-4">
      <div className="w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_30px_90px_rgba(9,33,56,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-black">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-[#f3f8fc] px-4 py-2 text-sm font-black uppercase tracking-[0.14em]">
            Close
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
