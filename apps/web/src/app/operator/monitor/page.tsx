'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { disconnect, getSocket, joinTrip } from '@/lib/socket';
import { StatusBadge } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Trip {
  id: string;
  status: string;
  route: { from_city: string; to_city: string };
  conductor: { name: string };
  driver?: { name: string } | null;
}
interface TripStatusSnapshot {
  id: string;
  passengers?: { sent?: number; total?: number };
  current_location?: { recorded_at?: string } | null;
}

interface Alert {
  type: 'conductor_offline' | 'conductor_online' | 'conductor_replaced';
  tripId: string;
  conductorId?: string;
  message: string;
  at: Date;
}

const ALERT_STYLES = {
  conductor_offline: { border: 'border-l-[#ffb4ab]', dot: 'bg-[#ffb4ab]', badge: 'bg-[#93000a]/30 text-[#ffb4ab] border-[#93000a]/50', icon: 'signal_wifi_off' },
  conductor_online: { border: 'border-l-green-500', dot: 'bg-green-400', badge: 'bg-green-900/30 text-green-400 border-green-800/50', icon: 'wifi' },
  conductor_replaced: { border: 'border-l-[#ffb68b]', dot: 'bg-[#ffb68b]', badge: 'bg-[#602a00]/30 text-[#ffb68b] border-[#602a00]/50', icon: 'transfer_within_a_station' },
};

export default function MonitorPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const { data: trips } = useQuery<Trip[]>({
    queryKey: ['trips-active'],
    queryFn: () => get<Trip[]>('/api/trips?status=active'),
    refetchInterval: 30_000,
  });
  const { data: statusMap } = useQuery<Record<string, TripStatusSnapshot>>({
    queryKey: ['trip-monitor-snapshots', (trips ?? []).map((t) => t.id).join(',')],
    enabled: Boolean(trips?.length),
    queryFn: async () => {
      const snapshots = await Promise.all((trips ?? []).map(async (trip) => {
        const snapshot = await get<TripStatusSnapshot>(`/api/trips/${trip.id}/status`);
        return [trip.id, snapshot] as const;
      }));
      return Object.fromEntries(snapshots);
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;
    s.on('conductor_offline', (data: any) => {
      setAlerts((a) => [{ type: 'conductor_offline', tripId: data.tripId, conductorId: data.conductorId, message: `Trip ${data.tripId.slice(0, 8)}: conductor offline`, at: new Date() }, ...a]);
      toast.error(`Conductor offline — Trip ${data.tripId.slice(0, 8)}`);
    });
    s.on('conductor_online', (data: any) => {
      setAlerts((a) => [{ type: 'conductor_online', tripId: data.tripId, message: `Trip ${data.tripId.slice(0, 8)}: conductor recovered`, at: new Date() }, ...a]);
      toast.success(`Conductor recovered — Trip ${data.tripId.slice(0, 8)}`);
    });
    s.on('conductor_replaced', (data: any) => {
      setAlerts((a) => [{ type: 'conductor_replaced', tripId: data.tripId, message: `Trip ${data.tripId.slice(0, 8)}: driver took over`, at: new Date() }, ...a]);
    });
    return () => {
      s.off('conductor_offline');
      s.off('conductor_online');
      s.off('conductor_replaced');
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (!trips) return;
    socketRef.current = socketRef.current ?? getSocket();
    trips.forEach((t) => {
      if (!joinedIds.has(t.id)) { joinTrip(t.id); setJoinedIds((p) => new Set([...p, t.id])); }
    });
  }, [trips]);

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>LIVE MONITOR</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Real-time Conductor Heartbeat</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#a3cbf2]/10 border border-[#a3cbf2]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a3cbf2] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a3cbf2]">Live</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c2024] border border-[#42474e]/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">{trips?.length ?? 0} Active</span>
          </div>
        </div>
      </header>

      <div className="px-8 pt-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Active trips */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
            Active Deployments ({trips?.length ?? 0})
          </p>
          {(trips ?? []).length === 0 ? (
            <div className="bg-[#181c20] rounded-xl py-16 text-center border border-[#42474e]/20">
              <span className="material-symbols-outlined text-[48px] text-[#42474e] block mb-3">radar</span>
              <p className="text-sm text-[#8c9198]">No active trips right now.</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]/60 mt-1">Monitoring all channels.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(trips ?? []).map((trip) => {
                const isOffline = alerts.some((a) => a.tripId === trip.id && a.type === 'conductor_offline') &&
                  !alerts.some((a) => a.tripId === trip.id && a.type === 'conductor_online');
                return (
                  <div key={trip.id}
                    className={`bg-[#181c20] rounded-xl px-6 py-5 flex items-center justify-between border transition-all ${isOffline ? 'border-[#ffb4ab]/40 shadow-[0_0_20px_rgba(255,180,171,0.08)]' : 'border-[#42474e]/20 hover:border-[#42474e]/40'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${isOffline ? 'bg-[#93000a]/40' : 'bg-[#0b3c5d]/40'}`}>
                        <span className="material-symbols-outlined text-[22px] text-white">directions_bus</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#e0e3e8] text-sm">
                          {trip.route?.from_city} <span className="text-[#8c9198] mx-1">→</span> {trip.route?.to_city}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198] mt-0.5">Conductor: {trip.conductor?.name ?? '—'}</p>
                        <p className="text-[10px] text-[#8c9198] mt-1">
                          Alerted: {statusMap?.[trip.id]?.passengers?.sent ?? 0} / {statusMap?.[trip.id]?.passengers?.total ?? 0}
                        </p>
                        <p className="text-[10px] text-[#8c9198]">
                          Last GPS: {statusMap?.[trip.id]?.current_location?.recorded_at
                            ? new Date(statusMap[trip.id].current_location!.recorded_at!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                            : 'No update'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOffline && (
                        <span className="px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-[0.15em] bg-[#93000a]/30 text-[#ffb4ab] border-[#93000a]/50 animate-pulse">
                          OFFLINE
                        </span>
                      )}
                      <StatusBadge status={trip.status || 'active'} />
                      <Link href={`/operator/trips/${trip.id}`}
                        className="w-8 h-8 rounded-lg bg-[#1c2024] border border-[#42474e]/40 flex items-center justify-center text-[#8c9198] hover:text-[#a3cbf2] transition-colors">
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alert feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Alert Feed</p>
            {alerts.length > 0 && (
              <button onClick={() => setAlerts([])} className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8c9198] hover:text-[#c2c7ce] transition-colors">
                Clear All
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {alerts.length === 0 && (
              <div className="bg-[#181c20] rounded-xl py-12 text-center border border-[#42474e]/20">
                <span className="material-symbols-outlined text-[36px] text-[#42474e] block mb-2">notifications_none</span>
                <p className="text-xs text-[#8c9198]">No events yet.</p>
              </div>
            )}
            {alerts.map((a, i) => {
              const style = ALERT_STYLES[a.type];
              return (
                <div key={i} className={`bg-[#181c20] rounded-lg px-4 py-3 border border-[#42474e]/20 border-l-2 ${style.border}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#1c2024] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#e0e3e8]">{a.message}</p>
                      <p className="text-[10px] font-mono text-[#8c9198] mt-0.5">{a.at.toLocaleTimeString('en-IN')}</p>
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 border rounded flex-shrink-0 ${style.badge}`}>
                      {a.type.replace('conductor_', '').toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
