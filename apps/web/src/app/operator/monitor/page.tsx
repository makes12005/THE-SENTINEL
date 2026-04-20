'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { getSocket, joinTrip } from '@/lib/socket';
import { PageHeader, StatusBadge } from '@/components/ui';
import toast from 'react-hot-toast';

interface Trip {
  id: string;
  status: string;
  route: { from_city: string; to_city: string };
  conductor: { name: string };
  driver?: { name: string } | null;
}

interface Alert {
  type: 'conductor_offline' | 'conductor_online' | 'conductor_replaced';
  tripId: string;
  conductorId?: string;
  message: string;
  at: Date;
}

export default function MonitorPage() {
  const [alerts,    setAlerts]    = useState<Alert[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const socketRef   = useRef<ReturnType<typeof getSocket> | null>(null);

  const { data: trips } = useQuery<Trip[]>({
    queryKey: ['trips-active'],
    queryFn:  () => get<Trip[]>('/api/trips?status=active'),
    refetchInterval: 30_000,
  });

  // Connect and join all active trip rooms
  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    s.on('conductor_offline', (data: any) => {
      setAlerts((a) => [
        { type: 'conductor_offline', tripId: data.tripId, conductorId: data.conductorId, message: `Trip ${data.tripId}: conductor offline (last seen ${new Date(data.lastSeenAt).toLocaleTimeString()})`, at: new Date() },
        ...a,
      ]);
      toast.error(`Conductor offline — Trip ${data.tripId.slice(0, 8)}`);
    });

    s.on('conductor_online', (data: any) => {
      setAlerts((a) => [
        { type: 'conductor_online', tripId: data.tripId, message: `Trip ${data.tripId}: conductor back online`, at: new Date() },
        ...a,
      ]);
      toast.success(`Conductor recovered — Trip ${data.tripId.slice(0, 8)}`);
    });

    s.on('conductor_replaced', (data: any) => {
      setAlerts((a) => [
        { type: 'conductor_replaced', tripId: data.tripId, message: `Trip ${data.tripId}: driver took over`, at: new Date() },
        ...a,
      ]);
    });

    return () => {
      s.off('conductor_offline');
      s.off('conductor_online');
      s.off('conductor_replaced');
    };
  }, []);

  useEffect(() => {
    if (!trips) return;
    const s = socketRef.current ?? getSocket();
    trips.forEach((t) => {
      if (!joinedIds.has(t.id)) {
        joinTrip(t.id);
        setJoinedIds((p) => new Set([...p, t.id]));
      }
    });
  }, [trips]);

  const ALERT_STYLES = {
    conductor_offline:  { bg: 'bg-[#93000a]/30', text: 'text-[#ffb4ab]', icon: 'signal_wifi_off' },
    conductor_online:   { bg: 'bg-[#0b3c5d]/30', text: 'text-[#a3cbf2]', icon: 'wifi' },
    conductor_replaced: { bg: 'bg-[#602a00]/30', text: 'text-[#ffb68b]', icon: 'transfer_within_a_station' },
  };

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Live Monitor" subtitle="Real-time Conductor Heartbeat" />
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#a3cbf2] animate-pulse" />
          <span className="text-xs text-[#c2c7ce] uppercase tracking-widest">Live</span>
        </div>
      </header>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active trips */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Active Trips ({trips?.length ?? 0})
          </h2>
          {(trips ?? []).length === 0 ? (
            <div className="bg-[#181c20] rounded-xl py-14 text-center text-[#8c9198]">
              <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">radar</span>
              <p className="text-sm">No active trips right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(trips ?? []).map((trip) => {
                const isOffline = alerts.some((a) => a.tripId === trip.id && a.type === 'conductor_offline') &&
                  !alerts.some((a) => a.tripId === trip.id && a.type === 'conductor_online' && alerts.find((b) => b.tripId === trip.id && b.type === 'conductor_offline' && b.at < a.at));
                return (
                  <div key={trip.id} className={`bg-[#181c20] rounded-xl px-6 py-5 flex items-center justify-between border ${isOffline ? 'border-[#ffb4ab]/40' : 'border-transparent'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isOffline ? 'bg-[#93000a]' : 'bg-[#0b3c5d]'}`}>
                        <span className="material-symbols-outlined text-xl text-white">directions_bus</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#e0e2e8] text-sm">{trip.route?.from_city} → {trip.route?.to_city}</p>
                        <p className="text-xs text-[#c2c7ce] opacity-60">Conductor: {trip.conductor?.name ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOffline && (
                        <span className="px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-wider bg-[#93000a]/30 text-[#ffb4ab] animate-pulse">
                          OFFLINE
                        </span>
                      )}
                      <StatusBadge status="active" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alert feed */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Alert Feed
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
            {alerts.length === 0 && (
              <div className="bg-[#181c20] rounded-xl py-10 text-center text-[#8c9198]">
                <p className="text-sm">No events yet.</p>
              </div>
            )}
            {alerts.map((a, i) => {
              const style = ALERT_STYLES[a.type];
              return (
                <div key={i} className={`rounded-xl px-4 py-3 ${style.bg}`}>
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${style.text}`}>{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${style.text}`}>{a.message}</p>
                      <p className="text-[0.625rem] font-mono text-[#8c9198] mt-0.5">{a.at.toLocaleTimeString()}</p>
                    </div>
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
