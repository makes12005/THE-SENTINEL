'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { TableSkeleton } from '@/components/ui';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  bus_number: string | null;
  passenger_count: number;
}

export default function CompletedTripsPage() {
  const [search, setSearch] = useState('');

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => get('/api/trips'),
    refetchInterval: 60_000,
  });

  const completedTrips = (trips ?? []).filter((t) =>
    ['completed', 'done', 'finished'].includes(t.status)
  );

  const filtered = completedTrips.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (t.bus_number ?? '').toLowerCase().includes(q) ||
      t.route.from_city.toLowerCase().includes(q) ||
      t.route.to_city.toLowerCase().includes(q)
    );
  });

  const totalPassengers = completedTrips.reduce((sum, t) => sum + (t.passenger_count ?? 0), 0);

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Atmospheric blurs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-[#ffb68b]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <Link href="/operator/trips" className="w-9 h-9 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            COMPLETED TRIPS
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">
            ARCHIVE // ALL SECTORS
          </p>
        </div>
        <button className="bg-[#a3cbf2] text-[#003352] font-bold uppercase tracking-widest text-[10px] px-6 h-10 rounded-lg flex items-center gap-2 shadow-xl hover:bg-[#cee5ff] transition-colors">
          EXPORT HISTORY
          <span className="material-symbols-outlined text-[16px]">download</span>
        </button>
      </header>

      <div className="px-8 pt-8 max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Summary stats bento */}
        <section className="grid grid-cols-3 gap-6">
          {[
            { label: 'TOTAL COMPLETED', value: completedTrips.length.toLocaleString(), glow: 'bg-[#a3cbf2]/5' },
            { label: 'ON-TIME PERFORMANCE', value: '94.2%', icon: 'trending_up', glow: 'bg-[#ffb68b]/5' },
            { label: 'TOTAL PAX CARRIED', value: totalPassengers.toLocaleString(), glow: 'bg-[#c4c0ff]/5' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#181c20] border border-[#42474e]/30 rounded-xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 ${stat.glow} rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110`} />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] relative z-10">{stat.label}</h3>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="font-mono text-3xl font-bold text-[#e0e3e8]">{stat.value}</span>
                {stat.icon && <span className="material-symbols-outlined text-[#a3cbf2] text-sm">{stat.icon}</span>}
              </div>
            </div>
          ))}
        </section>

        {/* Search & filter bar */}
        <section className="flex gap-4 items-center bg-[#1c2024] border border-[#42474e]/50 p-3 rounded-lg">
          <div className="flex-1 relative bg-[#0b0f12] rounded border border-[#42474e]/50 flex items-center px-4 h-11">
            <span className="material-symbols-outlined text-[#8c9198] mr-3 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="QUERY BUS NO. OR ROUTE ID..."
              className="bg-transparent border-none text-[#e0e3e8] w-full focus:ring-0 text-[10px] font-bold uppercase tracking-[0.12em] placeholder:text-[#8c9198]/50 outline-none"
            />
          </div>
          <div className="relative bg-[#0b0f12] rounded border border-[#42474e]/50 flex items-center px-4 h-11 w-52 cursor-pointer">
            <span className="material-symbols-outlined text-[#8c9198] mr-3 text-[16px]">calendar_month</span>
            <span className="text-[#e0e3e8] text-[10px] font-bold uppercase tracking-[0.12em]">LAST 30 DAYS</span>
            <span className="material-symbols-outlined text-[#8c9198] ml-auto text-[16px]">arrow_drop_down</span>
          </div>
          <button className="h-11 px-5 border border-[#42474e]/50 rounded text-[#a3cbf2] text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-[#262a2f] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            FILTERS
          </button>
        </section>

        {/* Trips Table */}
        <section className="bg-[#181c20] rounded-xl border border-[#42474e]/30 overflow-hidden">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#42474e]/50 bg-[#262a2f]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                    <th className="p-4 font-normal">BUS ID</th>
                    <th className="p-4 font-normal">ROUTE</th>
                    <th className="p-4 font-normal">DATE</th>
                    <th className="p-4 font-normal">CONDUCTOR</th>
                    <th className="p-4 font-normal">PAX</th>
                    <th className="p-4 font-normal">STATUS</th>
                    <th className="p-4 font-normal text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#42474e]/20">
                  {filtered.map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#1c2024] transition-colors group">
                      <td className="p-4 font-mono text-sm font-bold text-[#a3cbf2]">
                        {trip.bus_number || '—'}
                      </td>
                      <td className="p-4 text-sm text-[#e0e3e8]">
                        {trip.route.from_city} <span className="text-[#8c9198] mx-1">→</span> {trip.route.to_city}
                      </td>
                      <td className="p-4 text-sm text-[#c2c7ce]">{trip.scheduled_date}</td>
                      <td className="p-4 text-sm text-[#c2c7ce]">{trip.conductor.name}</td>
                      <td className="p-4 text-sm text-[#c2c7ce]">{trip.passenger_count ?? 0}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-[#31353a] text-[#8c9198] text-[9px] font-bold uppercase tracking-[0.2em]">
                          COMPLETED
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/operator/trips/${trip.id}`}
                          className="text-[#a3cbf2] hover:text-[#cee5ff] text-[10px] font-bold uppercase tracking-[0.12em] flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          DETAILS <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <span className="material-symbols-outlined text-[48px] text-[#42474e] block mb-3">history</span>
                        <p className="text-[#8c9198] text-sm">No completed trips found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
