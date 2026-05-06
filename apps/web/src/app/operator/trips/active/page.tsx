'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { StatusBadge, TableSkeleton } from '@/components/ui';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  bus_number: string | null;
  passenger_count: number;
}

export default function ActiveTripsPage() {
  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => get('/api/trips'),
    refetchInterval: 15_000,
  });

  const activeTrips = (trips ?? []).filter((t) =>
    ['active', 'in_progress', 'started'].includes(t.status)
  );
  const featuredTrip = activeTrips[0] ?? null;
  const otherTrips = activeTrips.slice(1);

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Atmospheric */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a3cbf2]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#c4c0ff]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <Link href="/operator/trips" className="w-9 h-9 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            TODAY / CURRENT
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb68b] animate-pulse" />
              {activeTrips.length} ACTIVE DEPLOYMENTS
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#ffb68b]/10 px-3 py-1.5 rounded-full border border-[#ffb68b]/30">
          <span className="w-2 h-2 rounded-full bg-[#ffb68b] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb68b]">Live Now</span>
        </div>
      </header>

      <div className="px-8 pt-8 max-w-7xl mx-auto space-y-8 relative z-10">
        {isLoading ? (
          <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : activeTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="material-symbols-outlined text-[64px] text-[#42474e]">explore_off</span>
            <p className="text-[#8c9198] text-lg font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>No Active Trips</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]/60">All deployments are either scheduled or completed.</p>
          </div>
        ) : (
          <>
            {/* Featured Active Trip — bento style */}
            {featuredTrip && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Operations Card */}
                <section className="lg:col-span-2 bg-[#181c20] border border-[#42474e]/30 rounded-xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffb68b]/5 rounded-full blur-3xl" />
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <h2 className="text-lg font-bold text-[#e0e3e8] flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <span className="w-10 h-10 flex items-center justify-center bg-[#262a2f] rounded-lg border border-[#42474e]/50">
                        <span className="material-symbols-outlined text-[#ffb68b] text-[20px]">directions_bus</span>
                      </span>
                      Live Operations
                    </h2>
                    <span className="inline-flex items-center gap-2 bg-[#ffb68b]/10 border border-[#ffb68b]/30 text-[#ffb68b] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em]">
                      <span className="w-2 h-2 rounded-full bg-[#ffb68b] animate-pulse shadow-[0_0_8px_rgba(255,182,139,0.6)]" />
                      Live Now
                    </span>
                  </div>
                  {/* Trip detail */}
                  <div className="bg-[#1c2024] border border-[#42474e]/50 rounded-lg p-6 relative z-10">
                    <div className="grid grid-cols-2 gap-8 items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-2">Vehicle ID</p>
                        <p className="font-mono text-xl font-bold text-[#a3cbf2] tracking-widest">{featuredTrip.bus_number || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-1">Origin</p>
                          <p className="font-bold text-[#e0e3e8] text-base">{featuredTrip.route.from_city}</p>
                        </div>
                        <span className="material-symbols-outlined text-[#8c9198] text-[20px]">arrow_forward</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-1">Destination</p>
                          <p className="font-bold text-[#e0e3e8] text-base">{featuredTrip.route.to_city}</p>
                        </div>
                      </div>
                    </div>
                    {/* Route progress bar */}
                    <div className="mt-6 h-16 bg-[#0b0f12] rounded-lg border border-[#42474e]/30 relative overflow-hidden flex items-center">
                      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-[#42474e]/50 rounded-full" />
                      <div className="absolute left-4 w-1/3 top-1/2 -translate-y-1/2 h-1 bg-[#ffb68b] rounded-full" />
                      <div className="absolute left-[33%] top-1/2 -translate-y-1/2 w-4 h-4 bg-[#ffb68b] rounded-full shadow-[0_0_12px_rgba(255,182,139,0.8)] border-2 border-[#0b0f12] z-10" />
                      <p className="absolute bottom-1 left-4 text-[9px] font-bold uppercase tracking-wider text-[#ffb68b]">In Transit</p>
                      <p className="absolute bottom-1 right-4 text-[9px] font-bold uppercase tracking-wider text-[#8c9198]">ETA —</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3 relative z-10">
                    <div className="flex-1 bg-[#262a2f] border border-[#42474e]/40 rounded-lg px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Conductor</p>
                      <p className="text-sm font-bold text-[#c2c7ce] mt-1">{featuredTrip.conductor.name}</p>
                    </div>
                    <div className="flex-1 bg-[#262a2f] border border-[#42474e]/40 rounded-lg px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Passengers</p>
                      <p className="font-mono text-xl font-bold text-[#a3cbf2] mt-1">{featuredTrip.passenger_count}</p>
                    </div>
                    <div className="flex-1 bg-[#262a2f] border border-[#42474e]/40 rounded-lg px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Date</p>
                      <p className="font-mono text-sm font-bold text-[#c2c7ce] mt-1">{featuredTrip.scheduled_date}</p>
                    </div>
                  </div>
                </section>

                {/* Quick Actions */}
                <section className="bg-[#262a2f] border border-[#42474e]/30 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
                      Quick Actions
                    </h3>
                    <p className="text-sm text-[#c2c7ce] mb-6">Monitor live telemetry and manage active deployments from this console.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link href={`/operator/trips/${featuredTrip.id}`}
                      className="w-full h-14 bg-[#a3cbf2] text-[#003352] font-bold uppercase tracking-widest text-[11px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#cee5ff] transition-colors shadow-xl">
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      View Details
                    </Link>
                    <button className="w-full h-14 bg-transparent border border-[#42474e]/50 text-[#c2c7ce] font-bold uppercase tracking-widest text-[11px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#262a2f] transition-colors">
                      <span className="material-symbols-outlined text-[18px]">sensors</span>
                      Communicate
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* Upcoming / rest of active trips */}
            {otherTrips.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-[#42474e]/20">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 flex items-center justify-center bg-[#181c20] rounded-lg border border-[#42474e]/50">
                    <span className="material-symbols-outlined text-[#c4c0ff] text-[18px]">schedule</span>
                  </span>
                  <h2 className="text-lg font-bold text-[#e0e3e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Other Active
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {otherTrips.map((trip) => (
                    <div key={trip.id} className="bg-[#181c20] border border-[#42474e]/30 rounded-lg px-5 py-4 flex items-center justify-between hover:bg-[#1c2024] transition-colors group">
                      <div className="flex items-center gap-6 w-1/3">
                        <span className="font-mono text-base font-bold text-[#e0e3e8] group-hover:text-[#a3cbf2] transition-colors">
                          {trip.bus_number || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3 flex-1">
                        <span className="font-bold text-sm text-[#c2c7ce]">{trip.route.from_city}</span>
                        <span className="material-symbols-outlined text-[#8c9198] text-[16px]">arrow_forward</span>
                        <span className="text-sm text-[#8c9198]">{trip.route.to_city}</span>
                      </div>
                      <div className="flex items-center gap-4 justify-end w-1/3">
                        <StatusBadge status={trip.status} />
                        <Link href={`/operator/trips/${trip.id}`}
                          className="text-[#a3cbf2] text-[10px] font-bold uppercase tracking-[0.12em] hover:text-[#cee5ff] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          VIEW <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
