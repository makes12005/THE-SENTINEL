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

export default function RouteDetailsPage() {
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const qc = useQueryClient();
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopForm, setStopForm] = useState({ name: '', sequence_number: '1', trigger_radius_km: '10' });
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);

  const route = useQuery<RouteDetails>({
    queryKey: ['route-detail', routeId],
    queryFn: () => get(`/api/routes/${routeId}`),
    enabled: !!routeId,
  });

  const stops = route.data?.stops ?? [];

  const resetStopForm = () => {
    const nextSeq = stops.length ? Math.max(...stops.map((s) => s.sequence_number)) + 1 : 1;
    setStopForm({ name: '', sequence_number: String(nextSeq), trigger_radius_km: '10' });
    setPickedLatLng(null);
    setEditingStop(null);
  };

  const addStop = useMutation({
    mutationFn: (data: any) => post(`/api/routes/${routeId}/stops`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      toast.success('Stop added');
      setShowStopModal(false);
      resetStopForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to add stop'),
  });

  const updateStop = useMutation({
    mutationFn: ({ stopId, data }: { stopId: string; data: any }) => put(`/api/routes/${routeId}/stops/${stopId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-detail', routeId] });
      toast.success('Stop updated');
      setShowStopModal(false);
      resetStopForm();
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
      stops.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        sequence_number: s.sequence_number,
        trigger_radius_km: s.trigger_radius_km,
      })),
    [stops]
  );

  const reorderStop = (stop: Stop, direction: -1 | 1) => {
    const sorted = [...stops].sort((a, b) => a.sequence_number - b.sequence_number);
    const index = sorted.findIndex((s) => s.id === stop.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    updateStop.mutate({ stopId: stop.id, data: { sequence_number: swapWith.sequence_number } });
    updateStop.mutate({ stopId: swapWith.id, data: { sequence_number: stop.sequence_number } });
  };

  const saveStop = () => {
    if (!stopForm.name || !pickedLatLng) {
      toast.error('Stop name and map-selected coordinates are required');
      return;
    }
    const payload = {
      name: stopForm.name,
      sequence_number: Number(stopForm.sequence_number),
      latitude: pickedLatLng.lat,
      longitude: pickedLatLng.lng,
      trigger_radius_km: Number(stopForm.trigger_radius_km || '10'),
    };
    if (editingStop) {
      updateStop.mutate({ stopId: editingStop.id, data: payload });
      return;
    }
    addStop.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] px-8 py-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-[1200px] mx-auto space-y-6">
        <Link href="/operator/routes" className="text-sm text-[#94a3b8] hover:text-[#F1F5F9]">
          ← Back to Routes
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">{route.data?.name ?? 'Route'}</h1>
            <p className="text-[#6C63FF]">{route.data?.from_city} → {route.data?.to_city}</p>
          </div>
          <button
            onClick={() => {
              resetStopForm();
              setShowStopModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#6C63FF] text-white text-sm font-bold"
          >
            Add Stop
          </button>
        </div>

        <RouteMap stops={mapStops} height="420px" readonly />

        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl divide-y divide-[#1E293B]">
          {stops.map((s, idx) => (
            <div key={s.id} className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 text-[#6C63FF] font-bold text-sm flex items-center justify-center">{s.sequence_number}</div>
              <div className="flex-1">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-[#94a3b8]">{s.latitude.toFixed(5)}, {s.longitude.toFixed(5)} · {s.trigger_radius_km} km</p>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={idx === 0} onClick={() => reorderStop(s, -1)} className="px-2 py-1 text-xs rounded bg-[#1E293B] disabled:opacity-30">↑</button>
                <button disabled={idx === stops.length - 1} onClick={() => reorderStop(s, 1)} className="px-2 py-1 text-xs rounded bg-[#1E293B] disabled:opacity-30">↓</button>
                <button onClick={() => {
                  setEditingStop(s);
                  setPickedLatLng({ lat: s.latitude, lng: s.longitude });
                  setStopForm({ name: s.name, sequence_number: String(s.sequence_number), trigger_radius_km: s.trigger_radius_km });
                  setShowStopModal(true);
                }} className="px-3 py-1 text-xs rounded bg-[#6C63FF]/20 text-[#6C63FF]">Edit</button>
                <button
                  onClick={() => {
                    if (stops.length <= 1) {
                      toast.error('At least one stop is required');
                      return;
                    }
                    if (confirm('Delete this stop?')) deleteStop.mutate(s.id);
                  }}
                  className="px-3 py-1 text-xs rounded bg-[#ef4444]/20 text-[#ef4444]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {stops.length === 0 && <div className="p-8 text-center text-[#94a3b8]">No stops yet.</div>}
        </div>
      </div>

      {showStopModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-[#131B2E] border border-[#1E293B] rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-black">{editingStop ? 'Edit Stop' : 'Add Stop'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <input className="bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5" placeholder="Stop name" value={stopForm.name} onChange={(e) => setStopForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5" type="number" placeholder="Sequence" value={stopForm.sequence_number} onChange={(e) => setStopForm((f) => ({ ...f, sequence_number: e.target.value }))} />
              <input className="bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5" value={pickedLatLng?.lat ?? ''} placeholder="Latitude" readOnly />
              <input className="bg-[#0F172A] border border-[#1E293B] rounded-xl px-3 py-2.5" value={pickedLatLng?.lng ?? ''} placeholder="Longitude" readOnly />
            </div>
            <div className="text-xs text-[#94a3b8]">Pick from map below to auto-fill coordinates.</div>
            <RouteMap stops={mapStops} height="280px" onMapClick={(lat, lng) => setPickedLatLng({ lat, lng })} />
            <div className="flex gap-3">
              <button onClick={() => setShowStopModal(false)} className="flex-1 border border-[#1E293B] rounded-xl py-2.5">Cancel</button>
              <button onClick={saveStop} className="flex-1 bg-[#6C63FF] rounded-xl py-2.5 font-bold">{editingStop ? 'Update Stop' : 'Add Stop'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
