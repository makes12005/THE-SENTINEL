'use client';
/**
 * Owner Dashboard — Screen 1
 * Agency-wide KPIs + operator performance table.
 * Data: GET /api/owner/summary + GET /api/owner/operators
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { get, post } from '@/lib/api';
import { CardSkeleton, TableSkeleton, PageHeader } from '@/components/ui';
import { MemberCard, type MemberRow } from '@/components/shared';
import toast from 'react-hot-toast';

interface OwnerSummary {
  total_operators:        number;
  active_trips:           number;
  total_passengers_today: number;
  alerts_sent_today:      number;
  failed_alerts_today:    number;
  trips_remaining:        number;
  trips_used_this_month:  number;
}

const STAT_CARDS = (s: OwnerSummary) => [
  { label: 'Trip Credits',      value: s.trips_remaining,        color: 'border-[#c4c0ff]', textColor: 'text-[#c4c0ff]', icon: 'account_balance_wallet' },
  { label: 'Trips Used (Mo)',   value: s.trips_used_this_month,  color: 'border-[#a3cbf2]', textColor: 'text-[#a3cbf2]', icon: 'history' },
  { label: 'Active Trips',      value: s.active_trips,           color: 'border-[#7dffd4]', textColor: 'text-[#7dffd4]', icon: 'directions_bus'  },
  { label: 'Passengers Today',  value: s.total_passengers_today, color: 'border-[#ffb68b]', textColor: 'text-[#ffb68b]', icon: 'group'           },
  { label: 'Alerts Sent',       value: s.alerts_sent_today,      color: 'border-[#7dffd4]', textColor: 'text-[#7dffd4]', icon: 'notifications'   },
  { label: 'Operators',         value: s.total_operators,        color: 'border-[#c2c7ce]', textColor: 'text-[#c2c7ce]', icon: 'manage_accounts' },
];

export default function OwnerDashboardPage() {
  const qc = useQueryClient();

  const { data: summary, isLoading: sumLoading } = useQuery<OwnerSummary>({
    queryKey: ['owner-summary'],
    queryFn:  () => get<OwnerSummary>('/api/owner/summary'),
    refetchInterval: 30_000,
  });

  const { data: operators, isLoading: opsLoading } = useQuery<MemberRow[]>({
    queryKey: ['owner-operators'],
    queryFn:  () => get<MemberRow[]>('/api/owner/operators'),
    refetchInterval: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      post(`/api/owner/operators/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      toast.success('Operator status updated');
    },
    onError: () => toast.error('Failed to update operator status'),
  });

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Agency Dashboard" subtitle="Owner Overview" />
        <Link
          href="/owner/operators"
          className="flex items-center gap-2 bg-[#c4c0ff] text-[#2000a4] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
          Manage Operators
        </Link>
      </header>

      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {sumLoading
            ? Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : summary && STAT_CARDS(summary).map((card) => (
              <div
                key={card.label}
                className={`bg-[#181c20] p-5 rounded-xl border-l-4 ${card.color} hover:scale-[1.01] transition-transform`}
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]">{card.label}</p>
                  <span className={`material-symbols-outlined text-[20px] ${card.textColor} opacity-60`}>{card.icon}</span>
                </div>
                <p className={`text-3xl font-black ${card.textColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {String(card.value).padStart(2, '0')}
                </p>
              </div>
            ))}
        </div>

        {/* Alerts banner */}
        {summary && summary.failed_alerts_today > 0 && (
          <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 p-5 rounded-xl flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="h-10 w-10 rounded-full bg-[#93000a] flex items-center justify-center text-[#ffdad6]">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div>
                <p className="font-bold text-[#ffb4ab]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {summary.failed_alerts_today} failed alert{summary.failed_alerts_today !== 1 ? 's' : ''} today
                </p>
                <p className="text-xs text-[#c2c7ce] opacity-70">Passengers may not have been notified</p>
              </div>
            </div>
            <Link
              href="/owner/logs?status=failed"
              className="bg-[#ffb4ab] text-[#690005] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all"
            >
              View Logs
            </Link>
          </div>
        )}

        {/* Two-column: operator list + quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Operator performance */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Operator Performance
              </h2>
              <Link href="/owner/operators" className="text-xs text-[#c4c0ff] uppercase tracking-widest hover:underline">
                Manage all
              </Link>
            </div>

            {opsLoading
              ? <TableSkeleton rows={4} />
              : (operators ?? []).slice(0, 5).map((op) => (
                <MemberCard
                  key={op.id}
                  member={op}
                  onToggle={(id, current) => toggleMutation.mutate({ id, current })}
                />
              ))
            }
            {!opsLoading && !operators?.length && (
              <div className="py-10 text-center text-[#8c9198] bg-[#181c20] rounded-xl">
                <p className="text-sm">No operators yet. Add one in the Operators screen.</p>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Quick Access
            </h2>
            {[
              { href: '/owner/trips',     icon: 'directions_bus',  label: 'All Trips',    sub: 'Monitor agency-wide trips' },
              { href: '/owner/logs',      icon: 'receipt_long',    label: 'Alert Logs',   sub: 'All delivery statuses' },
              { href: '/owner/settings',  icon: 'settings',        label: 'Agency Config',sub: 'Name, phone, email' },
              { href: '/owner/wallet',    icon: 'account_balance_wallet', label: 'Trip Wallet',   sub: 'Credits & usage' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 bg-[#181c20] hover:bg-[#1c2024] p-4 rounded-xl transition-colors group"
              >
                <div className="h-10 w-10 rounded-xl bg-[#262a2f] flex items-center justify-center text-[#c4c0ff] group-hover:bg-[#3826cd]/30 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-[#e0e2e8]">{item.label}</p>
                  <p className="text-xs text-[#8c9198]">{item.sub}</p>
                </div>
                <span className="material-symbols-outlined text-[#8c9198] ml-auto">chevron_right</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
