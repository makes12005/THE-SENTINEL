'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { get } from '@/lib/api';
import { TableSkeleton } from '@/components/ui';

interface Summary {
  active_trips: number;
  total_passengers_today: number;
  alerts_sent_today: number;
  failed_alerts_today: number;
  trips_remaining: number;
}

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  started_at: string | null;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  bus?: { registration_number: string };
  passenger_count: number;
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ['operator-summary'],
    queryFn: () => get<Summary>('/api/operator/summary'),
    refetchInterval: 30_000,
  });

  const { data: tripsList, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['trips-list'],
    queryFn: () => get<Trip[]>('/api/trips'),
    refetchInterval: 30_000,
  });

  const tripsRemaining = summary?.trips_remaining ?? 0;
  const walletLow = tripsRemaining > 0 && tripsRemaining <= 5;
  const walletEmpty = tripsRemaining === 0;

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e2e8] pb-10">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-20 border-b border-[#ffffff0a] bg-[#12161a]">
        <div>
          <h1 className="text-xl font-bold text-[#a3cbf2] tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Operator Dashboard
          </h1>
        </div>
        <div className="flex-1 max-w-md ml-12">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9198] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search routes, buses, passenge"
              className="w-full bg-[#1c2024] text-sm text-[#e0e2e8] placeholder-[#8c9198] rounded-full pl-11 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-[#a3cbf2] border border-transparent focus:border-[#a3cbf2]/30 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="p-8 space-y-10 max-w-7xl mx-auto">
        {/* Stat Cards Row */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Card 1 */}
          <div className="flex-1 bg-[#1c2024] p-5 rounded-xl border border-[#ffffff0a] relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <span className="material-symbols-outlined absolute right-4 top-4 text-6xl text-[#ffffff05]">calendar_today</span>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#8c9198] z-10">
              ACTIVE TRIPS
            </p>
            <p className="text-4xl font-black text-[#e0e2e8] z-10" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {summaryLoading ? '-' : (summary?.active_trips ?? 0)}
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex-1 bg-[#1c2024] p-5 rounded-xl border border-[#ffffff0a] relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a3cbf2]" />
            <span className="material-symbols-outlined absolute right-4 top-4 text-6xl text-[#ffffff05]">directions_bus</span>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#8c9198] z-10 pl-2">
              PASSENGERS TODAY
            </p>
            <p className="text-4xl font-black text-[#a3cbf2] z-10 pl-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {summaryLoading ? '-' : (summary?.total_passengers_today ?? 0)}
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex-1 bg-[#1c2024] p-5 rounded-xl border border-[#ffffff0a] relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffb68b]" />
            <span className="material-symbols-outlined absolute right-4 top-4 text-6xl text-[#ffb68b08]">cloud_upload</span>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#ffb68b] z-10 pl-2">
              ALERTS SENT
            </p>
            <p className="text-4xl font-black text-[#ffb68b] z-10 pl-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {summaryLoading ? '-' : (summary?.alerts_sent_today ?? 0)}
            </p>
          </div>

          {/* Card 4 */}
          <div className="flex-1 bg-[#1c2024] p-5 rounded-xl border border-[#ffffff0a] relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#42474e]" />
            <span className="material-symbols-outlined absolute right-4 top-4 text-6xl text-[#ffffff05]">warning</span>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#8c9198] z-10 pl-2">
              FAILED ALERTS
            </p>
            <p className="text-4xl font-black text-[#e0e2e8] z-10 pl-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {summaryLoading ? '-' : (summary?.failed_alerts_today ?? 0)}
            </p>
          </div>

          {/* Create Trip Action */}
          <Link
            href="/operator/trips?modal=create"
            className="flex-1 bg-[#0b3c5d] hover:bg-[#0f4a73] p-5 rounded-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[120px] transition-colors group cursor-pointer border border-[#a3cbf2]/20 shadow-lg"
          >
            <div className="h-10 w-10 rounded-full bg-[#a3cbf2]/20 flex items-center justify-center text-[#a3cbf2] mb-2 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">add</span>
            </div>
            <p className="text-sm font-bold text-[#a3cbf2] uppercase tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>
              CREATE TRIP
            </p>
          </Link>
        </div>

        {(walletLow || walletEmpty) && (
          <div className={`rounded-xl border p-5 relative overflow-hidden ${walletEmpty ? 'bg-[#2a1414] border-[#ffb4ab]/40' : 'bg-[#1c2024] border-[#ffb68b]/20'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${walletEmpty ? 'bg-[#ffb4ab]' : 'bg-[#ffb68b]'}`} />
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.15em] text-[#e0e2e8] mb-1 pl-3">
              Wallet Warning
            </p>
            <p className={`text-sm pl-3 ${walletEmpty ? 'text-[#ffb4ab]' : 'text-[#ffb68b]'}`}>
              {walletEmpty ? 'No trips remaining. Contact owner.' : `Low trips remaining: ${tripsRemaining} trips left`}
            </p>
          </div>
        )}

        {/* Live Route Feed Table */}
        <div className="bg-[#12161a] rounded-xl border border-[#ffffff0a] overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-[#ffffff0a]">
            <h2 className="text-sm font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Live Route Feed
            </h2>
            <Link href="/operator/trips" className="text-xs text-[#a3cbf2] hover:underline flex items-center gap-1 font-medium">
              View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {tripsLoading ? (
            <div className="p-5">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#8c9198] border-b border-[#ffffff0a]">
                    <th className="px-6 py-4 font-semibold">BUS #</th>
                    <th className="px-6 py-4 font-semibold">ROUTE</th>
                    <th className="px-6 py-4 font-semibold">DEPARTURE</th>
                    <th className="px-6 py-4 font-semibold">MANIFEST</th>
                    <th className="px-6 py-4 font-semibold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#ffffff0a]">
                  {tripsList && tripsList.length > 0 && tripsList.slice(0, 8).map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#1c2024] transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-[#e0e2e8] text-xs">
                        {trip.bus?.registration_number || 'UNASSIGNED'}
                      </td>
                      <td className="px-6 py-4 text-[#e0e2e8]">
                        {trip.route?.from_city} <span className="text-[#8c9198] text-[10px] mx-1">→</span> {trip.route?.to_city}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#c2c7ce]">
                        {trip.scheduled_date.split('T')[1]?.slice(0, 5) || trip.scheduled_date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md bg-[#262a2f] text-[#8c9198] text-[0.625rem] font-bold tracking-widest uppercase border border-[#ffffff0a]">
                          {trip.passenger_count > 0 ? 'UPLOADED' : 'MISSING'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md bg-[#262a2f] text-[#8c9198] text-[0.625rem] font-bold tracking-widest uppercase border border-[#ffffff0a]">
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!tripsList || tripsList.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#8c9198]">
                        No recent trips found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
