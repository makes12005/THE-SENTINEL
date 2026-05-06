'use client';
/**
 * Owner — Analytics
 * Route performance, trip volume, and high-level KPIs based on real data.
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export default function OwnerAnalyticsPage() {
  const { data: summaryData, isLoading: loadingSummary } = useQuery<{ data: any }>({
    queryKey: ['owner-summary'],
    queryFn: () => get('/api/owner/summary'),
  });

  const { data: tripsData, isLoading: loadingTrips } = useQuery<{ data: any[] }>({
    queryKey: ['owner-trips'],
    queryFn: () => get('/api/owner/trips'),
  });

  const summary = summaryData?.data || {};
  const trips = tripsData?.data || [];

  const isLoading = loadingSummary || loadingTrips;

  const STATS = [
    { label: 'Active Trips',      value: isLoading ? '—' : (summary.active_trips?.toString() || '0'), delta: '', icon: 'route',       accent: '#7dffd4' },
    { label: 'Alerts Delivered',  value: isLoading ? '—' : (summary.alerts_sent_today?.toString() || '0'),  delta: '',   icon: 'notifications',  accent: '#a3cbf2' },
    { label: 'Failed Alerts',     value: isLoading ? '—' : (summary.failed_alerts_today?.toString() || '0'), delta: '',     icon: 'report_problem', accent: '#FF7A00' },
    { label: 'Total Operators',   value: isLoading ? '—' : (summary.total_operators?.toString() || '0'),   delta: '',    icon: 'group',          accent: '#6C63FF' },
  ];

  // Route Performance Aggregation
  const routeAgg = trips.reduce((acc: Record<string, any>, t: any) => {
    const name = t.route?.name || `${t.route?.from_city || '?'} → ${t.route?.to_city || '?'}`;
    if (!acc[name]) acc[name] = { name, trips: 0, alerts: 0 };
    acc[name].trips += 1;
    acc[name].alerts += (t.alerts?.sent || 0) + (t.alerts?.pending || 0);
    return acc;
  }, {});

  const routeList: any[] = Object.values(routeAgg).sort((a: any, b: any) => b.trips - a.trips).slice(0, 5);

  // Status Chart Aggregation
  const statusCounts = {
    scheduled: trips.filter((t: any) => t.status === 'scheduled').length,
    active: trips.filter((t: any) => t.status === 'active').length,
    completed: trips.filter((t: any) => t.status === 'completed').length,
  };
  const maxStatus = Math.max(statusCounts.scheduled, statusCounts.active, statusCounts.completed, 1);

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-8">
        <div>
          <p className="text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-[#475569]">Performance Intelligence</p>
          <h1 className="text-lg font-black tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ANALYTICS
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#1e293b]/50 px-4 py-2">
          <span className="material-symbols-outlined text-[16px] text-[#475569]">calendar_today</span>
          <span className="text-[0.625rem] font-bold uppercase tracking-widest text-[#94a3b8]">All Time</span>
          <span className="material-symbols-outlined text-[16px] text-[#475569]">expand_more</span>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-5xl">

        {/* KPI Stats */}
        <section className="grid grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 hover:border-[#6C63FF]/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-[20px]" style={{ color: s.accent }}>{s.icon}</span>
                {s.delta && (
                  <span className={`text-[0.5625rem] font-black rounded px-1.5 py-0.5 ${s.delta.startsWith('+') || s.delta.startsWith('-8') ? 'text-[#7dffd4] bg-[#7dffd4]/10' : 'text-[#FF7A00] bg-[#FF7A00]/10'}`}>
                    {s.delta}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>{s.value}</p>
              <p className="text-[0.5625rem] font-bold uppercase tracking-[0.15em] text-[#475569] mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-8">

          {/* Route Performance */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Route Volume (Top 5)
              </h3>
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Total Trips</span>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 space-y-5 h-[260px] overflow-y-auto">
              {isLoading ? (
                <div className="text-sm text-[#475569] text-center mt-10">Loading route data...</div>
              ) : routeList.length > 0 ? routeList.map((row) => (
                <div key={row.name}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#94a3b8] truncate pr-4">{row.name}</p>
                    <p className="text-xs font-black text-[#F1F5F9] shrink-0">{row.trips} trips</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#0F172A]">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(5, (row.trips / routeList[0].trips) * 100)}%`,
                        background: '#6C63FF',
                      }}
                    />
                  </div>
                </div>
              )) : (
                <div className="text-sm text-[#475569] text-center mt-10">No trips recorded yet.</div>
              )}
            </div>
          </section>

          {/* Trip Status Chart */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Trips By Status
            </h3>
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 h-[260px] flex flex-col justify-end gap-2">
              {isLoading ? (
                <div className="text-sm text-[#475569] text-center mb-24">Loading chart data...</div>
              ) : (
                <div className="flex items-end gap-6 h-full px-4">
                  {[
                    { label: 'Scheduled', value: statusCounts.scheduled, color: '#FF7A00' },
                    { label: 'Active', value: statusCounts.active, color: '#7dffd4' },
                    { label: 'Completed', value: statusCounts.completed, color: '#6C63FF' },
                  ].map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(5, (s.value / maxStatus) * 160)}px`,
                          background: s.color,
                          opacity: 0.8,
                        }}
                      />
                      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-[#475569]">{s.label}</p>
                      <p className="text-xs font-black text-[#F1F5F9]">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Coming soon banner */}
        <div className="rounded-2xl border border-dashed border-[#6C63FF]/30 bg-[#6C63FF]/5 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-[#6C63FF]/40 block mb-3">insights</span>
          <p className="text-sm font-black uppercase tracking-widest text-[#475569]">Full Analytics Suite Coming Soon</p>
          <p className="text-xs text-[#334155] mt-2">Passenger trends, alert delivery rates, and predictive delay modelling — next sprint.</p>
        </div>

      </div>
    </div>
  );
}
