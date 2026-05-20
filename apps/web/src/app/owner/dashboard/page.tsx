'use client';
/**
 * Owner Dashboard — "Sentinel Command Center"
 * Pixel-matches reference image 1.
 * Layout: header → 4 KPI cards → [Critical Issues | Live Trips Preview] → [Top Operators | System Health]
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface OwnerSummary {
  total_operators: number;
  active_trips: number;
  total_passengers_today: number;
  alerts_sent_today: number;
  failed_alerts_today: number;
  trips_remaining: number;
  trips_used_this_month: number;
  unassigned_trips: number;
}

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  assigned_operator_name?: string | null;
  passenger_count: number;
}


/* ─── Helpers ────────────────────────────────────────────────────────────── */
function statusChip(status: string, delay?: string) {
  if (status === 'delayed')
    return (
      <span className="rounded-full border border-[#FF7A00]/50 bg-[#FF7A00]/10 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#FF7A00]">
        Delayed {delay ? `(${delay})` : ''}
      </span>
    );
  return (
    <span className="rounded-full border border-[#7dffd4]/40 bg-[#0b3c5d] px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#7dffd4]">
      On Time
    </span>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function OwnerDashboardPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data: summary, isLoading: summaryLoading } = useQuery<OwnerSummary>({
    queryKey: ['owner-summary'],
    queryFn: () => get('/api/owner/summary'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: tripsData } = useQuery<Trip[]>({
    queryKey: ['owner-trips', 'dashboard'],
    queryFn: () => get('/api/owner/trips'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  interface OperatorRow {
    id: string;
    name: string;
    trips_created_count: number;
  }

  const { data: operatorsData } = useQuery<OperatorRow[]>({
    queryKey: ['owner-operators', 'dashboard'],
    queryFn: () => get('/api/owner/operators'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: logsData } = useQuery<{ data: Array<{ id: string, error_message: string, passenger_name: string, passenger_phone: string, status: string, attempted_at: string, channel: string }> }>({
    queryKey: ['owner-logs', 'failed', 'dashboard'],
    queryFn: () => get('/api/owner/logs', { status: 'failed' }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const totalOperators       = summary?.total_operators ?? 0;
  const activeTrips          = summary?.active_trips ?? 0;
  const passengersToday      = summary?.total_passengers_today ?? 0;
  const alertsSentToday      = summary?.alerts_sent_today ?? 0;
  const failedAlertsToday    = summary?.failed_alerts_today ?? 0;
  const tripsRemaining       = summary?.trips_remaining ?? 0;
  const tripsUsedThisMonth   = summary?.trips_used_this_month ?? 0;
  const lowWallet            = tripsRemaining > 0 && tripsRemaining < 5;
  const emptyWallet          = tripsRemaining === 0;

  /* Display trips: backend data if loaded, otherwise empty/fallback */
  const displayTrips = (tripsData && tripsData.length > 0)
    ? tripsData.slice(0, 5).map((t: any, i: number) => {
        // Calculate a pseudo-progress if active
        let progress = 0;
        let eta = '—';
        if (t.status === 'completed') progress = 100;
        else if (t.status === 'active' && t.started_at) {
          const mins = Math.floor((new Date().getTime() - new Date(t.started_at).getTime()) / 60000);
          progress = Math.min(95, Math.max(5, mins * 2));
          const etaDate = new Date(new Date().getTime() + (60 - mins) * 60000);
          eta = etaDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } else if (t.status === 'scheduled') {
           eta = new Date(t.scheduled_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
        
        return {
          id:       t.id,
          busNo:    t.bus_number || `BUS-UNASSIGNED`,
          route:    t.route.name,
          origin:   `${t.route.from_city} → ${t.route.to_city}`,
          progress: progress,
          status:   t.status === 'active' ? 'on_time' : (t.status === 'scheduled' ? 'delayed' : 'on_time'),
          eta:      eta,
          delay:    t.status === 'scheduled' ? 'pending' : undefined,
        };
      })
    : [];

  const displayAlerts = logsData?.data && logsData.data.length > 0
    ? logsData.data.slice(0, 4).map((log, i) => ({
        id: log.id,
        icon: log.channel === 'sms' ? 'sms_failed' : 'phone_missed',
        title: log.error_message || 'Alert delivery failed',
        sub: `Passenger: ${log.passenger_name} (${log.passenger_phone})`,
        severity: 'high'
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-6">
        <h2
          className="text-lg font-black tracking-wide text-[#F1F5F9]"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Sentinel Command Center
        </h2>

        <div className="flex items-center gap-3">
          <Link 
            href="/owner/trips"
            className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-bold text-white hover:bg-[#5a52d9] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">directions_bus</span>
            <span className="text-[0.75rem] uppercase tracking-wide">View Trips</span>
          </Link>

          <Link
            href="/owner/logs"
            className="relative flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2 text-sm text-[#94a3b8] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="text-[0.75rem]">Alerts</span>
            {failedAlertsToday > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF7A00] text-[10px] font-black text-white">
                {failedAlertsToday > 9 ? '9+' : failedAlertsToday}
              </span>
            )}
          </Link>

          <Link
            href="/owner/wallet"
            className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2 text-sm text-[#94a3b8] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span className="text-[0.75rem]">Wallet</span>
          </Link>
        </div>
      </header>

      <div className="p-6 space-y-5">

        {/* ── KPI Cards + trip wallet ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Operators', value: summaryLoading ? '—' : totalOperators, icon: 'badge', sub: 'In your agency' },
            { label: 'Active trips', value: summaryLoading ? '—' : activeTrips, icon: 'directions_bus', sub: 'Agency-wide' },
            { label: 'Passengers today', value: summaryLoading ? '—' : passengersToday, icon: 'group', sub: 'IST calendar day' },
            { label: 'Alerts sent today', value: summaryLoading ? '—' : alertsSentToday, icon: 'notifications_active', sub: 'Trip passengers' },
            { label: 'Failed alerts today', value: summaryLoading ? '—' : failedAlertsToday, icon: 'warning', sub: 'Needs follow-up' },
            {
              label: 'Trips remaining',
              value: summaryLoading ? '—' : tripsRemaining,
              icon: 'account_balance_wallet',
              sub: tripsUsedThisMonth ? `${tripsUsedThisMonth} used this month` : 'Wallet',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`rounded-2xl border p-5 ${
                kpi.label === 'Trips remaining' && lowWallet
                  ? 'border-[#FF7A00]/50 bg-[#FF7A00]/10'
                  : kpi.label === 'Trips remaining' && emptyWallet
                    ? 'border-[#93000a]/50 bg-[#93000a]/15'
                    : 'border-[#1e293b] bg-[#1e293b]/50'
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#64748b]">{kpi.label}</p>
                <span className="material-symbols-outlined text-[20px] text-[#94a3b8]">{kpi.icon}</span>
              </div>
              <p className="text-3xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString('en-IN') : kpi.value}
              </p>
              <p className="mt-2 text-xs text-[#64748b]">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {(lowWallet || emptyWallet) && !summaryLoading && (
          <div
            className={`rounded-xl border px-5 py-3.5 ${
              emptyWallet ? 'border-[#ffb4ab]/40 bg-[#93000a]/25' : 'border-[#FF7A00]/40 bg-[#FF7A00]/10'
            }`}
          >
            <p className={`text-sm font-bold ${emptyWallet ? 'text-[#ffb4ab]' : 'text-[#FF7A00]'}`}>
              {emptyWallet
                ? 'Trip wallet is empty — contact platform admin to top up before starting new trips.'
                : `Low balance: ${tripsRemaining} trips remaining (under 5). Contact admin to top up.`}
            </p>
          </div>
        )}

        {/* ── Unassigned Trip Warning ──────────────────────────────────── */}
        {!!summary?.unassigned_trips && summary.unassigned_trips > 0 && (
          <Link
            href="/owner/trips?unassigned=true"
            className="flex items-center justify-between rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 px-5 py-3.5"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#ffb4ab]">warning</span>
              <div>
                <p className="text-sm font-bold text-[#ffb4ab]">
                  {summary.unassigned_trips} trip{summary.unassigned_trips === 1 ? ' is' : 's are'} unassigned — open trips to assign an operator
                </p>
                <p className="text-xs text-[#64748b]">Deactivated operators lose assignment on active schedules</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[#ffb4ab]">arrow_forward</span>
          </Link>
        )}

        {/* ── Middle Row: Critical Issues + Live Trips Preview ─────────── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Critical Issues (left 2 cols) */}
          <div className="col-span-2 rounded-2xl border border-[#1e293b] bg-[#1e293b]/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F1F5F9]">Critical Issues</h3>
              <span className="rounded-full bg-[#FF7A00] px-2.5 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-white">
                High Priority
              </span>
            </div>

            <div className="space-y-3">
              {displayAlerts.length > 0 ? displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#0F172A] px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        alert.severity === 'high' ? 'bg-[#FF7A00]/20' : 'bg-[#1e293b]'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          alert.severity === 'high' ? 'text-[#FF7A00]' : 'text-[#94a3b8]'
                        }`}
                      >
                        {alert.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#F1F5F9]">{alert.title}</p>
                      <p className="text-xs text-[#64748b]">{alert.sub}</p>
                    </div>
                  </div>
                  <Link
                    href="/owner/logs"
                    className="text-[0.625rem] font-black uppercase tracking-widest text-[#6C63FF] hover:text-[#c4c0ff]"
                  >
                    View
                  </Link>
                </div>
              )) : (
                <p className="text-sm text-[#475569] text-center py-4">No critical issues logged.</p>
              )}
            </div>

            <Link
              href="/owner/logs"
              className="mt-4 block w-full py-2.5 text-center text-[0.625rem] font-black uppercase tracking-widest text-[#64748b] hover:text-[#F1F5F9] transition-colors"
            >
              See All Issues
            </Link>
          </div>

          {/* Live Trips Preview (right 3 cols) */}
          <div className="col-span-3 rounded-2xl border border-[#1e293b] bg-[#1e293b]/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F1F5F9]">Live Trips Preview</h3>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs text-[#94a3b8] hover:text-[#F1F5F9]">
                  Filter: All Lines
                </button>
                <button className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs text-[#94a3b8] hover:text-[#F1F5F9]">
                  Sort: Recent
                </button>
              </div>
            </div>

            {/* Table header */}
            <div className="mb-2 grid grid-cols-12 px-3 text-[0.625rem] font-bold uppercase tracking-widest text-[#475569]">
              <span className="col-span-2">Bus No.</span>
              <span className="col-span-4">Route &amp; Origin</span>
              <span className="col-span-3">Progress</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-1 text-right">ETA</span>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {displayTrips.length > 0 ? displayTrips.map((trip: any) => (
                <div
                  key={trip.id}
                  className="grid grid-cols-12 items-center rounded-xl border border-[#1e293b]/80 bg-[#0F172A]/60 px-3 py-3"
                >
                  <span className="col-span-2 text-sm font-bold text-[#F1F5F9]">{trip.busNo}</span>
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-[#F1F5F9]">{trip.route}</p>
                    <p className="text-xs text-[#475569]">{trip.origin}</p>
                  </div>
                  <div className="col-span-3 pr-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#c4c0ff]"
                        style={{ width: `${trip.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[0.5625rem] text-[#475569]">{trip.progress}% Complete</p>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    {statusChip(trip.status, trip.delay)}
                  </div>
                  <span className="col-span-1 text-right text-sm font-bold text-[#F1F5F9]">{trip.eta}</span>
                </div>
              )) : (
                <p className="text-sm text-[#475569] text-center py-4">No live trips currently available.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Top Operators + System Health ─────────────────── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Operators by trip volume (real data) */}
          <div className="col-span-3 rounded-2xl border border-[#1e293b] bg-[#1e293b]/50 p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#F1F5F9]">Operators</h3>
            <div className="space-y-3">
              {(operatorsData ?? [])
                .slice()
                .sort((a, b) => (b.trips_created_count ?? 0) - (a.trips_created_count ?? 0))
                .slice(0, 5)
                .map((op, idx) => (
                  <Link
                    key={op.id}
                    href={`/owner/operators/${op.id}`}
                    className="flex items-center gap-4 rounded-xl border border-[#1e293b] bg-[#0F172A]/60 px-4 py-3 hover:border-[#6C63FF]/40 transition-colors"
                  >
                    <span className="w-6 text-lg font-black text-[#475569]">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6C63FF]/20">
                      <span className="material-symbols-outlined text-[16px] text-[#6C63FF]">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#F1F5F9] truncate">{op.name}</p>
                      <p className="text-xs text-[#475569]">{op.trips_created_count ?? 0} trips created (all time)</p>
                    </div>
                  </Link>
                ))}
              {(operatorsData?.length ?? 0) === 0 && (
                <p className="text-sm text-[#475569]">No operators yet. Use &quot;Add Operator&quot; in the sidebar.</p>
              )}
            </div>
          </div>

          {/* System Health (2 cols) */}
          <div className="col-span-2 rounded-2xl border border-[#0B3C5D]/60 bg-gradient-to-br from-[#0B3C5D]/70 to-[#1e293b]/90 p-5">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-[#7dffd4]">System Health</h3>

            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#475569]">
                  Alerts delivered today
                </p>
                <p className="text-4xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {summaryLoading ? '—' : alertsSentToday}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#475569]">
                  Failed alerts today
                </p>
                <p className="text-4xl font-black text-[#FF7A00]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {summaryLoading ? '—' : failedAlertsToday}
                </p>
              </div>
            </div>

            <Link
              href="/owner/logs"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6C63FF]/40 bg-[#6C63FF]/10 py-2.5 text-xs font-bold uppercase tracking-widest text-[#6C63FF] transition-colors hover:bg-[#6C63FF]/20"
            >
              [ View Details ]
            </Link>

            {/* Fleet Health Score bar */}
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[0.625rem] text-[#475569]">
                <span>Alert success rate (today)</span>
                <span className="text-[#7dffd4]">
                  {summaryLoading || alertsSentToday + failedAlertsToday === 0
                    ? '—'
                    : `${Math.round((100 * alertsSentToday) / (alertsSentToday + failedAlertsToday))}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1e293b]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7dffd4] to-[#6C63FF]"
                  style={{
                    width:
                      summaryLoading || alertsSentToday + failedAlertsToday === 0
                        ? '0%'
                        : `${(100 * alertsSentToday) / (alertsSentToday + failedAlertsToday)}%`,
                  }}
                />
              </div>
            </div>

            {/* Lightning bolt icon bottom-right (matches reference) */}
            <div className="mt-5 flex justify-end">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e293b]/80">
                <span className="material-symbols-outlined text-[22px] text-[#6C63FF]">bolt</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
