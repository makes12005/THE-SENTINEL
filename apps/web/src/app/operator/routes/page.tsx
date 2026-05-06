'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del, put } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { MapStop } from '@/components/shared/RouteMap';

const RouteMap = dynamic(() => import('@/components/shared/RouteMap'), { ssr: false });

interface Route { id: string; name: string; from_city: string; to_city: string; stop_count: number; created_at: string; created_by_name?: string | null; }
interface Stop { id: string; name: string; sequence_number: number; latitude: number; longitude: number; trigger_radius_km: string; }

export default function RoutesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // Form states
  const [form, setForm] = useState({ name: '', from_city: '', to_city: '' });
  const [stopForm, setStopForm] = useState({ name: '', sequence_number: '', trigger_radius_km: '10' });

  const { data: routes = [], isLoading } = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: () => get('/api/routes'),
  });

  const { data: selectedRouteData } = useQuery<{ stops: Stop[] } & Route>({
    queryKey: ['route', selectedRoute?.id],
    queryFn: () => get(`/api/routes/${selectedRoute!.id}`),
    enabled: !!selectedRoute,
  });

  const stops: Stop[] = selectedRouteData?.stops ?? [];

  const createRoute = useMutation({
    mutationFn: (data: typeof form) => post<Route>('/api/routes', data),
    onSuccess: (route: Route) => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      setSelectedRoute(route);
      setShowCreate(false);
      setForm({ name: '', from_city: '', to_city: '' });
      setTimeout(() => openAddStop(), 150);
      toast.success('Route created. Add stops to complete setup.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create route'),
  });

  const deleteRoute = useMutation({
    mutationFn: (id: string) => del(`/api/routes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); if (selectedRoute) setSelectedRoute(null); toast.success('Route deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const addStop = useMutation({
    mutationFn: (data: any) => post(`/api/routes/${selectedRoute!.id}/stops`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['route', selectedRoute?.id] }); qc.invalidateQueries({ queryKey: ['routes'] }); setShowStopModal(false); resetStopForm(); toast.success('Stop added'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const updateStop = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/api/routes/${selectedRoute!.id}/stops/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['route', selectedRoute?.id] }); setShowStopModal(false); setEditingStop(null); resetStopForm(); toast.success('Stop updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const deleteStop = useMutation({
    mutationFn: (id: string) => del(`/api/routes/${selectedRoute!.id}/stops/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['route', selectedRoute?.id] }); qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Stop removed'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });

  const resetStopForm = () => { setStopForm({ name: '', sequence_number: '', trigger_radius_km: '10' }); setPickedLatLng(null); setEditingStop(null); };

  const openAddStop = () => {
    resetStopForm();
    const nextSeq = stops.length ? Math.max(...stops.map(s => s.sequence_number)) + 1 : 1;
    setStopForm(f => ({ ...f, sequence_number: String(nextSeq) }));
    setShowStopModal(true);
  };

  const openEditStop = (s: Stop) => {
    setEditingStop(s);
    setStopForm({ name: s.name, sequence_number: String(s.sequence_number), trigger_radius_km: s.trigger_radius_km });
    setPickedLatLng({ lat: s.latitude, lng: s.longitude });
    setShowStopModal(true);
  };

  const handleSaveStop = () => {
    if (!stopForm.name || !pickedLatLng) return toast.error('Name and map location are required');
    const payload = { name: stopForm.name, sequence_number: Number(stopForm.sequence_number), latitude: pickedLatLng.lat, longitude: pickedLatLng.lng, trigger_radius_km: Number(stopForm.trigger_radius_km) };
    if (editingStop) updateStop.mutate({ id: editingStop.id, data: payload });
    else addStop.mutate(payload);
  };

  const mapStops: MapStop[] = stops.map(s => ({ id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude, sequence_number: s.sequence_number, trigger_radius_km: s.trigger_radius_km }));

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="px-8 py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-[#F1F5F9] tracking-wide">ROUTE MANAGEMENT</h1>
            <p className="text-sm text-[#64748b] mt-1">Define physical paths and stops for your fleet</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6C63FF] text-white text-sm font-bold hover:bg-[#5a53e0] transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span> New Route
          </button>
        </div>

        <div className="grid grid-cols-[380px_1fr] gap-6">
          {/* Left: Route List */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-[#64748b] font-bold mb-4">{routes.length} Routes</p>
            {isLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#1E293B] animate-pulse" />)
            ) : routes.length === 0 ? (
              <div className="text-center py-16 text-[#64748b]">
                <span className="material-symbols-outlined text-4xl mb-3 block">route</span>
                <p className="text-sm">No routes yet. Create your first route.</p>
              </div>
            ) : routes.map(route => (
              <div key={route.id} onClick={() => setSelectedRoute(route)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedRoute?.id === route.id ? 'bg-[#1E293B] border-[#6C63FF]/60' : 'bg-[#131B2E] border-[#1E293B] hover:border-[#6C63FF]/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#F1F5F9] truncate">{route.name}</p>
                    <p className="text-xs text-[#6C63FF] mt-0.5">{route.from_city} → {route.to_city}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-[#64748b]">{route.stop_count} stops</span>
                        <span className="text-xs text-[#64748b]">by {route.created_by_name ?? 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/operator/routes/${route.id}`} onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-all">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </Link>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRoute(route); }}
                      className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-all">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this route?')) deleteRoute.mutate(route.id); }}
                      className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Route Detail */}
          {selectedRoute ? (
            <div className="bg-[#131B2E] rounded-2xl border border-[#1E293B] overflow-hidden">
              {/* Route header */}
              <div className="px-6 py-5 border-b border-[#1E293B] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#F1F5F9]">{selectedRoute.name}</h2>
                  <p className="text-sm text-[#6C63FF]">{selectedRoute.from_city} → {selectedRoute.to_city}</p>
                </div>
                <button onClick={openAddStop} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C63FF]/15 text-[#6C63FF] text-sm font-bold border border-[#6C63FF]/30 hover:bg-[#6C63FF]/25 transition-all">
                  <span className="material-symbols-outlined text-[16px]">add_location_alt</span> Add Stop
                </button>
              </div>

              {/* Map */}
              <div className="px-6 py-5">
                <RouteMap stops={mapStops} height="320px" readonly />
              </div>

              {/* Stops list */}
              <div className="px-6 pb-6">
                <p className="text-xs uppercase tracking-widest text-[#64748b] font-bold mb-3">{stops.length} Stops</p>
                {stops.length === 0 ? (
                  <p className="text-sm text-[#64748b] text-center py-6">No stops yet. Click "Add Stop" to begin.</p>
                ) : (
                  <div className="space-y-2">
                    {stops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${idx === 0 ? 'bg-[#22c55e]/20 border-[#22c55e]/50 text-[#22c55e]' : idx === stops.length - 1 ? 'bg-[#ef4444]/20 border-[#ef4444]/50 text-[#ef4444]' : 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-[#6C63FF]'}`}>{stop.sequence_number}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#F1F5F9]">{stop.name}</p>
                          <p className="text-xs text-[#64748b]">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)} · {stop.trigger_radius_km} km radius</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditStop(stop)} className="p-1.5 rounded-lg text-[#64748b] hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-all">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={() => { if (confirm('Remove stop?')) deleteStop.mutate(stop.id); }} className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-[#131B2E] rounded-2xl border border-[#1E293B] text-[#64748b]">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl mb-3 block text-[#1E293B]">route</span>
                <p className="text-sm">Select a route to view details and stops</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Route Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-[#F1F5F9] mb-5">Create New Route</h3>
            <div className="space-y-4">
              {[['Route Name', 'name', 'e.g. Ahmedabad → Surat Express'], ['From City', 'from_city', 'e.g. Ahmedabad'], ['To City', 'to_city', 'e.g. Surat']].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none focus:border-[#6C63FF]/60" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-[#1E293B] text-[#64748b] text-sm font-bold hover:text-[#F1F5F9] transition-all">Cancel</button>
              <button onClick={() => createRoute.mutate(form)} disabled={createRoute.isPending || !form.name || !form.from_city || !form.to_city}
                className="flex-1 py-2.5 rounded-xl bg-[#6C63FF] text-white text-sm font-bold hover:bg-[#5a53e0] disabled:opacity-50 transition-all">
                {createRoute.isPending ? 'Creating…' : 'Create Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Stop Modal */}
      {showStopModal && selectedRoute && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-black text-[#F1F5F9] mb-5">{editingStop ? 'Edit Stop' : 'Add Stop'}</h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Stop Name</label>
                <input value={stopForm.name} onChange={e => setStopForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nadiad Bus Stand"
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none focus:border-[#6C63FF]/60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Sequence #</label>
                <input type="number" value={stopForm.sequence_number} onChange={e => setStopForm(f => ({ ...f, sequence_number: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#6C63FF]/60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Radius (km)</label>
                <input type="number" step="0.5" value={stopForm.trigger_radius_km} onChange={e => setStopForm(f => ({ ...f, trigger_radius_km: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#6C63FF]/60" />
              </div>
            </div>

            {/* Coordinate display */}
            {pickedLatLng && (
              <div className="mb-3 px-4 py-2 bg-[#6C63FF]/10 border border-[#6C63FF]/30 rounded-xl text-xs text-[#6C63FF] font-bold">
                📍 {pickedLatLng.lat.toFixed(6)}, {pickedLatLng.lng.toFixed(6)}
              </div>
            )}

            {/* Map picker */}
            <div className="rounded-xl overflow-hidden border border-[#1E293B] mb-5">
              <RouteMap
                stops={[
                  ...mapStops,
                  ...(pickedLatLng && !editingStop ? [{ name: stopForm.name || 'New Stop', latitude: pickedLatLng.lat, longitude: pickedLatLng.lng, sequence_number: Number(stopForm.sequence_number) || 99 }] : []),
                ]}
                onMapClick={(lat, lng) => setPickedLatLng({ lat, lng })}
                height="300px"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowStopModal(false); resetStopForm(); }} className="flex-1 py-2.5 rounded-xl border border-[#1E293B] text-[#64748b] text-sm font-bold hover:text-[#F1F5F9] transition-all">Cancel</button>
              <button onClick={handleSaveStop} disabled={addStop.isPending || updateStop.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#6C63FF] text-white text-sm font-bold hover:bg-[#5a53e0] disabled:opacity-50 transition-all">
                {addStop.isPending || updateStop.isPending ? 'Saving…' : editingStop ? 'Update Stop' : 'Add Stop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
