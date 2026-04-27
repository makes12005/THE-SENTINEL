'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CardSkeleton, PageHeader, TableSkeleton } from '@/components/ui';
import { MemberCard, type MemberRow } from '@/components/shared';
import { getSocket } from '@/lib/socket';
import { get, post } from '@/lib/api';

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

const statCards = (summary: OwnerSummary) => [
  { label: 'Trip Credits', value: summary.trips_remaining, color: 'border-[#c4c0ff]', textColor: 'text-[#c4c0ff]', icon: 'account_balance_wallet' },
  { label: 'Trips Used', value: summary.trips_used_this_month, color: 'border-[#a3cbf2]', textColor: 'text-[#a3cbf2]', icon: 'history' },
  { label: 'Active Trips', value: summary.active_trips, color: 'border-[#7dffd4]', textColor: 'text-[#7dffd4]', icon: 'directions_bus' },
  { label: 'Passengers Today', value: summary.total_passengers_today, color: 'border-[#ffb68b]', textColor: 'text-[#ffb68b]', icon: 'group' },
  { label: 'Alerts Sent', value: summary.alerts_sent_today, color: 'border-[#7dffd4]', textColor: 'text-[#7dffd4]', icon: 'notifications' },
  { label: 'Operators', value: summary.total_operators, color: 'border-[#c2c7ce]', textColor: 'text-[#c2c7ce]', icon: 'manage_accounts' },
];

export default function OwnerDashboardPage() {
  const queryClient = useQueryClient();

  const summary = useQuery<OwnerSummary>({
    queryKey: ['owner-summary'],
    queryFn: () => get('/api/owner/summary'),
    refetchInterval: 30000,
  });

  const operators = useQuery<MemberRow[]>({
    queryKey: ['owner-operators'],
    queryFn: () => get('/api/owner/operators'),
    refetchInterval: 60000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => post(`/api/owner/operators/${id}/toggle`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-operators'] });
      queryClient.invalidateQueries({ queryKey: ['owner-summary'] });
      toast.success('Operator status updated');
    },
    onError: () => toast.error('Failed to update operator status'),
  });

  useEffect(() => {
    const socket = getSocket();

    const handleTripUnassigned = (payload: { tripName: string; previousOperatorName: string }) => {
      toast((t) => (
        <span>
          Trip {payload.tripName} is now unassigned. Previous operator was {payload.previousOperatorName}.
        </span>
      ));
      queryClient.invalidateQueries({ queryKey: ['owner-summary'] });
      queryClient.invalidateQueries({ queryKey: ['owner-trips'] });
    };

    socket.on('trip_unassigned', handleTripUnassigned);
    return () => {
      socket.off('trip_unassigned', handleTripUnassigned);
    };
  }, [queryClient]);

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-gradient-to-b from-[#181c20] to-transparent px-8 backdrop-blur-sm">
        <PageHeader title="Agency Dashboard" subtitle="Owner overview" />
        <Link href="/owner/resources" className="rounded-xl bg-[#c4c0ff] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#2000a4]">
          Manage Resources
        </Link>
      </header>

      <div className="space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {summary.isLoading
            ? Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
            : summary.data && statCards(summary.data).map((card) => (
                <div key={card.label} className={`rounded-xl border-l-4 bg-[#181c20] p-5 ${card.color}`}>
                  <div className="mb-3 flex justify-between">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]">{card.label}</p>
                    <span className={`material-symbols-outlined text-[20px] ${card.textColor}`}>{card.icon}</span>
                  </div>
                  <p className={`text-3xl font-black ${card.textColor}`}>{String(card.value).padStart(2, '0')}</p>
                </div>
              ))}
        </div>

        {!!summary.data?.unassigned_trips && (
          <Link href="/owner/trips?unassigned=true" className="flex items-center justify-between rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 p-5">
            <div>
              <p className="font-bold text-[#ffb4ab]">{summary.data.unassigned_trips} trips are unassigned. Click here to reassign them.</p>
              <p className="text-xs text-[#c2c7ce]">Owner attention required</p>
            </div>
            <span className="material-symbols-outlined text-[#ffb4ab]">warning</span>
          </Link>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold text-[#e0e2e8]">Operators</h2>
              <Link href="/owner/operators" className="text-xs uppercase tracking-widest text-[#c4c0ff]">Manage all</Link>
            </div>

            {operators.isLoading ? (
              <TableSkeleton rows={4} />
            ) : (
              (operators.data ?? []).slice(0, 5).map((operator) => (
                <MemberCard key={operator.id} member={operator} onToggle={(id) => toggleMutation.mutate({ id })} />
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#e0e2e8]">Quick Access</h2>
            {[
              { href: '/owner/resources', icon: 'group', label: 'Resources', sub: 'Buses, conductors, drivers' },
              { href: '/owner/trips', icon: 'directions_bus', label: 'All Trips', sub: 'Reassign and monitor trips' },
              { href: '/owner/logs', icon: 'receipt_long', label: 'Alert Logs', sub: 'Delivery history' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-4 rounded-xl bg-[#181c20] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#262a2f] text-[#c4c0ff]">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#e0e2e8]">{item.label}</p>
                  <p className="text-xs text-[#8c9198]">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
