'use client';
/**
 * Owner — Schedules
 * Upcoming schedule templates, recurring trips, shift planning.
 */

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  assigned_operator_name?: string | null;
  conductor_name?: string | null;
  bus_number?: string | null;
}

export default function OwnerSchedulesPage() {
  const { data: tripsData, isLoading } = useQuery<{ data: Trip[] }>({
    queryKey: ['owner-trips'],
    queryFn: () => get('/api/owner/trips'),
  });

  const allTrips = tripsData?.data || [];
  
  // For 'Schedules', we'll focus on trips that are scheduled or active
  const scheduledTrips = allTrips.filter(t => t.status === 'scheduled');
  const activeTrips = allTrips.filter(t => t.status === 'active');
  const displayTrips = [...activeTrips, ...scheduledTrips];

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-8">
        <div>
          <p className="text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-[#475569]">Recurring Operations</p>
          <h1 className="text-lg font-black tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            SCHEDULES
          </h1>
        </div>
        <Link href="/owner/trips" className="flex items-center gap-2 rounded-xl bg-[#b0d4ff] px-4 py-2 text-[0.625rem] font-black uppercase tracking-widest text-[#0F172A] hover:brightness-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          View All Trips
        </Link>
      </header>

      <div className="p-8 space-y-6 max-w-5xl">

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Trips', value: isLoading ? '—' : activeTrips.length, accent: '#7dffd4' },
            { label: 'Upcoming Scheduled', value: isLoading ? '—' : scheduledTrips.length, accent: '#FF7A00' },
            { label: 'Total Tracked', value: isLoading ? '—' : displayTrips.length, accent: '#6C63FF' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 px-6 py-5"
              style={i === 0 ? { borderLeftColor: s.accent, borderLeftWidth: 2 } : {}}
            >
              <p className="text-[0.5625rem] font-bold uppercase tracking-[0.15em] text-[#475569] mb-2">{s.label}</p>
              <p className="text-3xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif', color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Schedule list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-[#475569] p-6 text-center">Loading schedule data...</div>
          ) : displayTrips.length > 0 ? displayTrips.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 hover:border-[#6C63FF]/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: route + meta */}
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[#0B3C5D] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px] text-[#a3cbf2]">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-[#F1F5F9]">{s.route?.name || `${s.route?.from_city} → ${s.route?.to_city}`}</p>
                    <p className="text-xs text-[#475569] mt-0.5">
                      {s.assigned_operator_name || s.conductor_name || 'Unassigned'} · {s.bus_number || 'No Bus'} · Date: <span className="text-[#94a3b8] font-semibold">{s.scheduled_date}</span>
                    </p>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`rounded border px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest ${
                    s.status === 'active'
                      ? 'border-[#7dffd4]/40 bg-[#7dffd4]/10 text-[#7dffd4]'
                      : 'border-[#FF7A00]/40 bg-[#FF7A00]/10 text-[#FF7A00]'
                  }`}>
                    {s.status}
                  </span>
                  <Link
                    href={`/owner/trips`}
                    className="h-8 w-8 rounded-xl border border-[#1e293b] bg-[#0F172A] flex items-center justify-center text-[#475569] hover:text-[#F1F5F9] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </Link>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 text-center text-[#475569] text-sm">
              No active or upcoming trips scheduled.
            </div>
          )}
        </div>

        {/* Coming soon note */}
        <div className="rounded-2xl border border-dashed border-[#1e293b] p-6 text-center">
          <p className="text-[0.625rem] font-black uppercase tracking-widest text-[#334155]">
            Full schedule builder with drag-and-drop shift planning — coming in next sprint
          </p>
        </div>

      </div>
    </div>
  );
}

