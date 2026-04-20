'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { get } from '@/lib/api';
import { CardSkeleton, TableSkeleton, PageHeader, StatusBadge } from '@/components/ui';

interface Summary {
  active_trips: number;
  total_passengers_today: number;
  alerts_sent_today: number;
  failed_alerts_today: number;
}

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  started_at: string | null;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
}

const STAT_CARDS = (s: Summary) => [
  { label: 'Active Trips',         value: s.active_trips,           color: 'border-[#a3cbf2]', textColor: 'text-[#a3cbf2]' },
  { label: 'Passengers Today',     value: s.total_passengers_today, color: 'border-[#c4c0ff]', textColor: 'text-[#c4c0ff]' },
  { label: 'Alerts Sent',          value: s.alerts_sent_today,      color: 'border-[#ffb68b]', textColor: 'text-[#ffb68b]' },
  { label: 'Failed Alerts',        value: s.failed_alerts_today,    color: 'border-[#ffb4ab]', textColor: 'text-[#ffb4ab]' },
];

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

  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Dashboard" subtitle="Operations Overview" />
        <Link
          href="/operator/trips?modal=create"
          className="flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Trip
        </Link>
      </header>

      <div className="p-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryLoading
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : summary && STAT_CARDS(summary).map((card) => (
              <div
                key={card.label}
                className={`bg-[#181c20] p-6 rounded-xl border-l-4 ${card.color} hover:scale-[1.01] transition-transform`}
              >
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
                  {card.label}
                </p>
                <p className={`text-4xl font-black ${card.textColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {String(card.value).padStart(2, '0')}
                </p>
              </div>
            ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Action required */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Action Required
            </h2>
            {summary && summary.failed_alerts_today > 0 && (
              <div className="bg-[#262a2f] p-6 rounded-xl flex justify-between items-center hover:scale-[1.01] transition-transform">
                <div className="flex gap-4 items-center">
                  <div className="h-12 w-12 rounded-full bg-[#93000a] flex items-center justify-center text-[#ffdad6]">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {summary.failed_alerts_today} failed alert{summary.failed_alerts_today !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-[#c2c7ce] opacity-70">Passengers may not have been notified</p>
                  </div>
                </div>
                <Link
                  href="/operator/logs"
                  className="bg-[#ffb4ab] text-[#690005] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  View Logs
                </Link>
              </div>
            )}
            {summary && summary.active_trips === 0 && (
              <div className="bg-[#262a2f] p-6 rounded-xl text-center py-10 text-[#8c9198]">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">directions_bus</span>
                <p className="text-sm">No active trips right now.</p>
              </div>
            )}
          </div>

          {/* Quick create CTA */}
          <div className="relative overflow-hidden rounded-xl bg-[#0b3c5d] p-8 flex flex-col items-center justify-center text-center gap-5 group">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-tr from-[#a3cbf2] to-[#c4c0ff]" />
            <div className="h-20 w-20 rounded-full bg-[#a3cbf2]/20 flex items-center justify-center text-[#a3cbf2] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-5xl">add_road</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#7fa7cd] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Create New Trip
              </h2>
              <p className="text-sm text-[#7fa7cd]/70 mt-1">Assign route, conductor & passengers</p>
            </div>
            <Link
              href="/operator/trips?modal=create"
              className="w-full bg-[#a3cbf2] text-[#003353] py-4 rounded-xl font-bold text-sm uppercase tracking-[0.15em] shadow-xl hover:brightness-110 active:scale-95 transition-all"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              + Create Trip
            </Link>
          </div>
        </div>

        {/* Recent trips table */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Recent Trips
            </h2>
            <Link href="/operator/trips" className="text-xs text-[#a3cbf2] uppercase tracking-widest hover:underline">
              View all
            </Link>
          </div>

          {tripsLoading ? (
            <TableSkeleton rows={4} />
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                    <th className="px-6 pb-2">Route</th>
                    <th className="px-6 pb-2">Conductor</th>
                    <th className="px-6 pb-2">Date</th>
                    <th className="px-6 pb-2">Status</th>
                    <th className="px-6 pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(tripsList ?? []).slice(0, 8).map((trip) => (
                    <tr
                      key={trip.id}
                      className="bg-[#181c20] hover:bg-[#1c2024] transition-colors"
                    >
                      <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">
                        {trip.route?.from_city} → {trip.route?.to_city}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#c2c7ce]">
                        {trip.conductor?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#8c9198]">
                        {trip.scheduled_date}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="px-6 py-4 rounded-r-xl text-right">
                        <Link
                          href={`/operator/trips/${trip.id}`}
                          className="text-xs text-[#a3cbf2] hover:underline uppercase tracking-wider"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!tripsList?.length && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                        No trips yet. Create your first one!
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
