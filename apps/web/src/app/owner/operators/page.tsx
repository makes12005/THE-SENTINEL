'use client';
/**
 * Owner — Operators Screen (Velox Ops grid style)
 * Grid view with stats, live registry activity, add/toggle operators.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import toast from 'react-hot-toast';

interface MemberRow {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  trips_created_count?: number;
  last_active_at?: string | null;
  status_label?: string;
  created_at?: string | null;
}


function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  if (label === 'shift_overdue') {
    return (
      <span className="rounded border border-[#FF7A00]/60 bg-[#FF7A00]/10 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#FF7A00]">
        Shift Overdue
      </span>
    );
  }
  if (active) {
    return (
      <span className="rounded border border-[#7dffd4]/40 bg-[#7dffd4]/10 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#7dffd4]">
        Active
      </span>
    );
  }
  return (
    <span className="rounded border border-[#94a3b8]/30 bg-[#94a3b8]/10 px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-widest text-[#94a3b8]">
      Disabled
    </span>
  );
}

function OperatorsContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const { data: operators, isLoading } = useQuery<MemberRow[]>({
    queryKey: ['owner-operators'],
    queryFn: () => get<MemberRow[]>('/api/owner/operators'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }: { id: string; current: boolean }) =>
      post(`/api/owner/operators/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });



  const filtered = (operators ?? []).filter((op) =>
    op.name.toLowerCase().includes(search.toLowerCase()) || op.phone.includes(search)
  );
  const active = filtered.filter((o) => o.is_active).length;
  const totalTripsCreated = operators?.reduce((sum, op) => sum + (op.trips_created_count ?? 0), 0) || 0;



  // Derive activity from operator dates
  const liveActivity = [];
  if (operators) {
    for (const op of operators) {
      if (op.created_at) {
        liveActivity.push({
          timestamp: new Date(op.created_at).getTime(),
          time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(op.created_at)),
          text: 'New Operator ',
          bold: op.name,
          after: ' added to registry',
          boldAfter: '',
        });
      }
      if (op.last_active_at) {
        liveActivity.push({
          timestamp: new Date(op.last_active_at).getTime(),
          time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(op.last_active_at)),
          text: 'Operator ',
          bold: op.name,
          after: ' assigned to a trip',
          boldAfter: '',
        });
      }
    }
  }

  // Sort descending and take top 5
  liveActivity.sort((a, b) => b.timestamp - a.timestamp);
  const recentActivity = liveActivity.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-3 py-2 text-sm text-[#94a3b8] w-56">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Global fleet search…"
              className="bg-transparent outline-none text-sm text-[#F1F5F9] placeholder-[#475569] w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/owner/logs" 
            className="h-9 w-9 rounded-xl bg-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
            title="View Alert Logs"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </Link>
          <Link 
            href="/owner/settings" 
            className="h-9 w-9 rounded-xl bg-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
            title="Open Settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
          <Link 
            href="/owner/dashboard" 
            className="h-9 w-9 rounded-full bg-[#6C63FF]/30 flex items-center justify-center hover:bg-[#6C63FF]/50 transition-colors"
            title="Dashboard"
          >
            <span className="material-symbols-outlined text-[18px] text-[#6C63FF]">person</span>
          </Link>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* Page Title Row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#475569] mb-0.5">System Registry</p>
            <h1 className="text-3xl font-black tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              OPERATORS
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Grid / List toggle */}
            <div className="flex rounded-xl border border-[#1e293b] overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${view === 'grid' ? 'bg-[#1e293b] text-[#F1F5F9]' : 'text-[#475569] hover:text-[#F1F5F9]'
                  }`}
              >
                Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${view === 'list' ? 'bg-[#1e293b] text-[#F1F5F9]' : 'text-[#475569] hover:text-[#F1F5F9]'
                  }`}
              >
                List
              </button>
            </div>
            <Link
              href="/owner/operators/new"
              className="flex items-center gap-2 rounded-xl bg-[#b0d4ff] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#0F172A] hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Operator
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden border border-[#1e293b]">
          {[
            { label: 'Total Staff', value: operators?.length || 0, accent: '#6C63FF' },
            { label: 'Active Now', value: operators?.filter(o => o.is_active).length || 0, accent: '#7dffd4' },
            { label: 'Trips Created', value: totalTripsCreated, accent: '#FF7A00' },
          ].map((stat, i) => (
            <div key={stat.label} className={`bg-[#1e293b]/50 px-6 py-4 ${i === 0 ? 'border-l-2' : ''}`}
              style={i === 0 ? { borderLeftColor: '#6C63FF' } : i === 1 ? { borderLeftColor: '#7dffd4' } : { borderLeftColor: '#FF7A00' }}>
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#475569] mb-2">{stat.label}</p>
              <p className="text-3xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Operators Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-[#1e293b]/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {filtered.map((op) => (
              <div key={op.id} className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5 hover:border-[#6C63FF]/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#0F172A] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px] text-[#475569]">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-[#F1F5F9]">{op.name}</p>
                      <p className="text-xs text-[#475569]">{op.phone}</p>
                    </div>
                  </div>
                  <StatusBadge active={op.is_active} label={(op as any).status_label} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e293b]">
                  <div>
                    <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] mb-0.5">Trips Created</p>
                    <p className="text-xl font-black text-[#F1F5F9]">{op.trips_created_count ?? 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: op.id, current: op.is_active })}
                      className={`rounded-xl border px-3 py-2 text-[0.625rem] font-bold uppercase tracking-widest transition-colors ${op.is_active
                          ? 'border-[#FF7A00]/30 bg-[#FF7A00]/10 text-[#FF7A00]'
                          : 'border-[#7dffd4]/30 bg-[#7dffd4]/10 text-[#7dffd4]'
                        }`}
                    >
                      {op.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link
                      href={`/owner/operators/${op.id}`}
                      className="h-9 w-9 rounded-xl border border-[#1e293b] bg-[#0F172A] flex items-center justify-center text-[#475569] hover:text-[#F1F5F9] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <div className="col-span-2 py-20 text-center rounded-2xl border border-[#1e293b] bg-[#1e293b]/30">
                <span className="material-symbols-outlined text-4xl text-[#475569] mb-3 block">manage_accounts</span>
                <p className="text-sm text-[#475569]">No operators found. Add one to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Live Registry Activity */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#475569]">Live Registry Activity</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#7dffd4] animate-pulse" />
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">System Stable</span>
              <span className="text-[0.5625rem] text-[#334155] ml-4">
                Latest Sync: {recentActivity.length > 0 ? recentActivity[0].time : 'Never'}
              </span>
            </div>
          </div>
          <div className="space-y-2 border-t border-[#1e293b] pt-3">
            {recentActivity.length > 0 ? recentActivity.map((act, i) => (
              <div key={i} className="flex items-start gap-4 py-1.5">
                <span className="text-xs font-mono text-[#475569] min-w-[40px]">{act.time}</span>
                <p className="text-xs text-[#94a3b8]">
                  {act.text}<span className="font-bold text-[#6C63FF]">{act.bold}</span>{act.after}
                  {act.boldAfter && <span className="font-bold text-[#6C63FF]">{act.boldAfter}</span>}
                </p>
              </div>
            )) : (
              <p className="text-xs text-[#475569] italic">No recent activity found.</p>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}

export default function OwnerOperatorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] p-6 text-[#F1F5F9] animate-pulse">Loading Registry...</div>}>
      <OperatorsContent />
    </Suspense>
  );
}
