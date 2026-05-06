'use client';

import Link from 'next/link';
import { useState } from 'react';
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

export default function UpcomingTripsPage() {
  const [search, setSearch] = useState('');

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => get('/api/trips'),
    refetchInterval: 30_000,
  });

  const upcomingTrips = (trips ?? []).filter((t) =>
    ['scheduled', 'pending', 'confirmed', 'boarding'].includes(t.status)
  );

  const filtered = upcomingTrips.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (t.bus_number ?? '').toLowerCase().includes(q) ||
      t.route.from_city.toLowerCase().includes(q) ||
      t.route.to_city.toLowerCase().includes(q) ||
      t.conductor.name.toLowerCase().includes(q)
    );
  });

  const statusColor: Record<string, string> = {
    boarding: 'bg-[#a3cbf2]/10 text-[#a3cbf2] border-[#a3cbf2]/20',
    scheduled: 'bg-[#42474e]/40 text-[#8c9198] border-[#42474e]/30',
    pending: 'bg-[#42474e]/40 text-[#8c9198] border-[#42474e]/30',
    confirmed: 'bg-[#c4c0ff]/10 text-[#c4c0ff] border-[#c4c0ff]/20',
  };

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Atmospheric */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <Link href="/operator/trips" className="w-9 h-9 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            UPCOMING TRIPS
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3cbf2] animate-pulse" />
            {upcomingTrips.length} ROUTES DETECTED
          </p>
        </div>
        <button className="h-10 px-5 border border-[#ffb68b]/30 bg-[#ffb68b]/10 text-[#ffb68b] text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 rounded-lg hover:bg-[#ffb68b]/20 transition-colors">
          <span className="material-symbols-outlined text-[16px]">sync</span>
          Live Sync
        </button>
      </header>

      <div className="px-8 pt-8 max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Page header */}
        <div className="flex justify-between items-end pb-6 border-b border-[#42474e]/20">
          <div>
            <h2 className="text-4xl font-black text-[#e0e3e8] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upcoming Trips
            </h2>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-4 items-center bg-[#1c2024] border border-[#42474e]/50 p-3 rounded-lg">
          <div className="flex-1 relative bg-[#0b0f12] rounded border border-[#42474e]/50 flex items-center px-4 h-11">
            <span className="material-symbols-outlined text-[#8c9198] mr-3 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="QUERY BUS NO. OR ROUTE..."
              className="bg-transparent border-none text-[#e0e3e8] w-full focus:ring-0 text-[10px] font-bold uppercase tracking-[0.12em] placeholder:text-[#8c9198]/50 outline-none"
            />
          </div>
          <button className="h-11 px-5 border border-[#42474e]/50 rounded text-[#a3cbf2] text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-[#262a2f] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filters
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none" />
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse relative z-10">
                <thead>
                  <tr className="bg-[#1c2024] border-b border-[#42474e]/30 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                    <th className="py-4 px-6 font-normal w-32">Status</th>
                    <th className="py-4 px-6 font-normal w-48">Asset ID</th>
                    <th className="py-4 px-6 font-normal">Vector / Route</th>
                    <th className="py-4 px-6 font-normal w-40">Conductor</th>
                    <th className="py-4 px-6 font-normal w-36">Departure</th>
                    <th className="py-4 px-6 font-normal w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#42474e]/10">
                  {filtered.map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#1c2024]/50 transition-colors group">
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-[0.15em] ${statusColor[trip.status] ?? statusColor.scheduled}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {trip.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 font-mono text-base font-bold text-[#e0e3e8]">
                        {trip.bus_number || '—'}
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#e0e3e8]">{trip.route.from_city}</span>
                          <span className="material-symbols-outlined text-[#8c9198] text-[16px]">arrow_forward</span>
                          <span className="text-[#c2c7ce]">{trip.route.to_city}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-sm text-[#c2c7ce]">{trip.conductor.name}</td>
                      <td className="py-5 px-6 font-mono text-base font-bold text-[#ffb68b]">
                        {trip.scheduled_date}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <Link href={`/operator/trips/${trip.id}`}
                          className="w-8 h-8 rounded bg-[#262a2f] flex items-center justify-center text-[#8c9198] hover:text-[#a3cbf2] transition-colors ml-auto opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <span className="material-symbols-outlined text-[48px] text-[#42474e] block mb-3">calendar_month</span>
                        <p className="text-[#8c9198] text-sm">No upcoming trips found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination footer */}
          {filtered.length > 0 && (
            <div className="bg-[#1c2024] p-4 border-t border-[#42474e]/30 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                SHOWING 1–{filtered.length} OF {filtered.length} RECORDS
              </span>
              <div className="flex gap-2">
                <button disabled className="w-8 h-8 rounded bg-[#262a2f] border border-[#42474e]/30 flex items-center justify-center text-[#8c9198] disabled:opacity-40">
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button disabled className="w-8 h-8 rounded bg-[#262a2f] border border-[#42474e]/30 flex items-center justify-center text-[#8c9198] disabled:opacity-40">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
