'use client';
/**
 * Owner — Trip monitoring: agency-wide trips with operator column via TripTable.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { get, put } from '@/lib/api';
import type { TripRow } from '@/components/shared';
import { TripTable } from '@/components/shared';

interface TripApi {
  id: string;
  status: string;
  scheduled_date: string;
  owner_name?: string | null;
  assigned_operator_name?: string | null;
  assigned_operator_id?: string | null;
  conductor_name?: string | null;
  route: { name: string; from_city: string; to_city: string };
  passenger_count: number;
  alerts?: { pending: number; sent: number; failed: number };
}

interface Operator {
  id: string;
  name: string;
  is_active: boolean;
}

function tripRowsFromApi(rows: TripApi[]): TripRow[] {
  return rows.map((t) => {
    const alerts = t.alerts;
    const summary =
      alerts !== undefined
        ? `Alerts pending ${alerts.pending} · sent ${alerts.sent} · failed ${alerts.failed} · ${t.passenger_count} pax`
        : undefined;
    const isExpired = t.status === 'expired' || (t.status === 'scheduled' && new Date(t.scheduled_date) < new Date());
    return {
      id: t.id,
      status: t.status,
      scheduled_date: t.scheduled_date,
      operator_name: t.assigned_operator_name ?? t.owner_name ?? undefined,
      route: t.route,
      conductor: t.conductor_name ? { name: t.conductor_name } : {},
      passenger_count: t.passenger_count,
      alert_summary: summary,
      isExpired,
    };
  });
}

function ReassignModal({ trip, onClose }: { trip: TripApi; onClose: () => void }) {
  const qc = useQueryClient();
  const [assignedId, setAssignedId] = useState(trip.assigned_operator_id ?? '');
  const operators = useQuery<Operator[]>({
    queryKey: ['agency-operators'],
    queryFn: () => get('/api/agency/operators'),
  });
  const mutation = useMutation({
    mutationFn: () =>
      put(`/api/trips/${trip.id}/reassign`, { assigned_operator_id: assignedId }),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'owner-trips' });
      toast.success('Trip reassigned');
      onClose();
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to reassign'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="w-full max-w-md rounded-2xl border border-[#1e293b] bg-[#0F172A] p-8"
      >
        <h2 className="mb-2 text-xl font-black text-[#6C63FF]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Reassign Trip
        </h2>
        <p className="mb-4 text-sm text-[#475569]">Currently: {trip.assigned_operator_name ?? 'Unassigned'}</p>
        <select
          required
          value={assignedId}
          onChange={(e) => setAssignedId(e.target.value)}
          className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-3 text-sm text-[#F1F5F9] outline-none"
        >
          <option value="">Select operator</option>
          {(operators.data ?? [])
            .filter((o) => o.is_active)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#1e293b] py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-xl bg-[#6C63FF] py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}

function OwnerTripsInner() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const unassigned = searchParams.get('unassigned') === 'true';
  const [tab, setTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [operatorQ, setOperatorQ] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [reassigning, setReassigning] = useState<TripApi | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (unassigned) p.set('unassigned', 'true');
    else if (tab === 'today') p.set('window', 'today');
    else if (tab === 'upcoming') p.set('window', 'upcoming');
    else if (tab === 'completed') p.set('window', 'completed');
    if (statusFilter) p.set('status', statusFilter);
    if (dateFilter) p.set('date', dateFilter);
    if (operatorQ.trim()) p.set('operator', operatorQ.trim());
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [unassigned, tab, statusFilter, dateFilter, operatorQ]);

  const trips = useQuery<TripApi[]>({
    queryKey: ['owner-trips', qs],
    queryFn: () => get(`/api/owner/trips${qs}`),
    refetchInterval: 30000,
  });

  const rows = tripRowsFromApi(trips.data ?? []);

  const warnUnassigned =
    !unassigned &&
    rows.some((r) => {
      const raw = trips.data?.find((t) => t.id === r.id);
      return raw && !raw.assigned_operator_id;
    });

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="p-6 flex-1 flex flex-col space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#475569] mb-0.5">Fleet Operations</p>
            <h1 className="text-3xl font-black tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              TRIP MONITORING
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/owner/trips/new"
              className="rounded-xl bg-[#b0d4ff] px-5 py-2.5 text-[0.625rem] font-black uppercase tracking-widest text-[#0F172A] hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              CREATE TRIP
            </Link>
            {unassigned && (
              <Link
                href="/owner/trips"
                className="rounded-xl border border-[#6C63FF]/40 px-4 py-2 text-[0.625rem] font-black uppercase tracking-widest text-[#6C63FF]"
              >
                Clear unassigned filter
              </Link>
            )}
            {!unassigned && (
              <div className="flex rounded-xl border border-[#1e293b] overflow-hidden bg-[#1e293b]/40">
                {(
                  [
                    ['today', 'Today'],
                    ['upcoming', 'Upcoming'],
                    ['completed', 'Completed'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`px-4 py-2.5 text-[0.625rem] font-black uppercase tracking-widest transition-colors ${
                      tab === k ? 'bg-[#6C63FF]/20 text-[#6C63FF]' : 'text-[#94a3b8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {warnUnassigned && (
          <div className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
            Some trips have no assigned operator —{' '}
            <Link href="/owner/trips?unassigned=true" className="underline font-bold text-[#F1F5F9]">
              view unassigned only
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            >
              <option value="">All (respect tab)</option>
              <option value="scheduled">scheduled</option>
              <option value="active">active</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div>
            <label className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] block mb-1">Scheduled date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] block mb-1">Operator name</label>
            <input
              type="search"
              value={operatorQ}
              onChange={(e) => setOperatorQ(e.target.value)}
              placeholder="Search operator…"
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            />
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ['owner-trips'] })}
            className="rounded-xl border border-[#334155] px-4 py-2.5 text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#F1F5F9]"
          >
            Refresh
          </button>
        </div>

        {trips.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[#1e293b]/50 animate-pulse" />
            ))}
          </div>
        ) : trips.isError ? (
          <p className="text-sm text-[#ffb4ab]">Could not load trips.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[#1e293b]/80">
              <TripTable
                trips={rows}
                basePath="/owner/trips"
                showOperator
                extraActions={(trip) => (
                  <button
                    type="button"
                    onClick={() => {
                      const full = (trips.data ?? []).find((t) => t.id === trip.id);
                      if (full) setReassigning(full);
                    }}
                    className="rounded-lg border border-[#1e293b] bg-[#0F172A] px-2.5 py-1 text-[0.5625rem] font-black uppercase tracking-widest text-[#64748b] hover:text-[#F1F5F9]"
                  >
                    Reassign
                  </button>
                )}
              />
            </div>
            {(trips.data ?? []).length === 0 && (
              <p className="text-sm text-[#475569]">No trips match these filters.</p>
            )}
          </>
        )}
      </div>
      {reassigning && <ReassignModal trip={reassigning} onClose={() => setReassigning(null)} />}
    </div>
  );
}

export default function OwnerTripsPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#0F172A] p-6 text-[#F1F5F9] animate-pulse">Loading trips…</div>}
    >
      <OwnerTripsInner />
    </Suspense>
  );
}
