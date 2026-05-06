'use client';
/**
 * Owner — Operator Profile & Controls
 * Shows operator details, permissions, danger zone, interaction log.
 */

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, post } from '@/lib/api';
import toast from 'react-hot-toast';

interface OperatorDetail {
  id: string;
  name: string;
  phone: string | null;
  email?: string;
  is_active: boolean;
  notes?: string;
  role: string;
  trips_created_count?: number;
  last_active_at?: string | null;
  created_at: string;
}

export default function OperatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: operator, isLoading, isError } = useQuery<OperatorDetail>({
    queryKey: ['operator-detail', id],
    queryFn: () => get<OperatorDetail>(`/api/owner/operators/${id}`),
  });

  const toggleMutation = useMutation({
    mutationFn: () => post(`/api/owner/operators/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-detail', id] });
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      toast.success('Account status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] p-6 animate-pulse">
        <div className="h-8 w-48 bg-[#1e293b] rounded-xl mb-6" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-[#1e293b] rounded-2xl" />
          <div className="h-64 bg-[#1e293b] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !operator) {
    return (
      <div className="min-h-screen bg-[#0F172A] p-6 text-[#F1F5F9]">
        <p className="text-sm text-[#ffb4ab]">Operator not found.</p>
        <Link href="/owner/operators" className="mt-4 inline-block text-[#6C63FF] text-sm underline">
          Back to operators
        </Link>
      </div>
    );
  }

  const op = operator;

  const derivedLogs = [];
  if (op.last_active_at) {
    derivedLogs.push({
      time: new Date(op.last_active_at).toLocaleTimeString('en-GB', { hour12: false }),
      event: 'Trip Created',
      detail: 'Assigned to a trip',
      type: 'success'
    });
  }
  if (op.created_at) {
    derivedLogs.push({
      time: new Date(op.created_at).toLocaleTimeString('en-GB', { hour12: false }),
      event: 'Account Created',
      detail: 'Added to registry',
      type: 'info'
    });
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>

      <div className="p-6">
        {/* Breadcrumb + Title */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#475569] mb-1">
              <Link href="/owner/operators" className="hover:text-[#F1F5F9] uppercase tracking-widest">Operators</Link>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="uppercase tracking-widest text-[#94a3b8]">{op.name}</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Operator Profile &amp; Controls
            </h1>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-xl border border-[#1e293b] bg-[#1e293b] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#F1F5F9] hover:bg-[#334155] transition-colors"
          >
            [ Edit Profile ]
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 overflow-hidden">
              <div className="flex items-center gap-4 p-5 border-b border-[#1e293b]">
                {/* Status bar on left */}
                <div className="w-1 self-stretch rounded-full bg-[#6C63FF]" />
                <div className="h-16 w-16 rounded-xl bg-[#0F172A] overflow-hidden flex items-center justify-center border border-[#1e293b]">
                  <span className="material-symbols-outlined text-[36px] text-[#334155]">person</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[0.5625rem] font-black uppercase tracking-widest px-2 py-0.5 rounded ${op.is_active ? 'bg-[#7dffd4]/10 text-[#7dffd4] border border-[#7dffd4]/30' : 'bg-[#334155]/40 text-[#94a3b8] border border-[#1e293b]'
                      }`}>
                      {op.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[0.5625rem] text-[#334155]">ID: OP-{id.slice(0, 4).toUpperCase()}-9021</span>
                  </div>
                  <p className="text-xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>{op.name}</p>
                  <p className="text-xs text-[#475569] uppercase tracking-wide">Primary Lead Operator</p>
                  <p className="text-xs text-[#334155] uppercase tracking-wide">Sector 7 Transit Hub</p>
                </div>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-5 border-b border-[#1e293b]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Enable Operator Account</p>
                  <p className="text-[0.5625rem] text-[#334155] uppercase tracking-wide mt-0.5">Grant active system access and telemetry</p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate()}
                  className={`relative h-6 w-11 rounded-full transition-colors ${op.is_active ? 'bg-[#6C63FF]' : 'bg-[#1e293b]'}`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all shadow-sm ${op.is_active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Identification & Bio */}
              <div className="p-5 space-y-4">
                <p className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Identification &amp; Bio</p>
                <div>
                  <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155] mb-1">Full Legal Name</p>
                  <p className="text-sm font-black uppercase tracking-wide text-[#F1F5F9]">{op.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155] mb-1">Phone</p>
                    <p className="text-sm font-bold text-[#F1F5F9]">{op.phone ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155] mb-1">Email</p>
                    <p className="text-sm font-bold text-[#F1F5F9]">{op.email ?? '—'}</p>
                  </div>
                </div>
                {op.notes && (
                  <div>
                    <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155] mb-2">Internal Notes</p>
                    <div className="rounded-xl border border-[#1e293b] bg-[#0F172A] p-4">
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide leading-relaxed">{op.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Interaction Log */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
              <p className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-[#475569] mb-4">Recent System Interaction Log</p>
              <div className="space-y-3">
                {derivedLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-xs font-mono text-[#334155] min-w-[60px]">{log.time}</span>
                    <span className={`text-[0.625rem] font-black uppercase tracking-widest min-w-[100px] ${log.type === 'success' ? 'text-[#7dffd4]' : 'text-[#94a3b8]'
                      }`}>{log.event}</span>
                    <span className="text-[0.625rem] text-[#334155] uppercase tracking-wide">{log.detail}</span>
                  </div>
                ))}
                {derivedLogs.length === 0 && (
                  <p className="text-xs text-[#475569] italic">No interactions recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
                <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] mb-2">Trips created</p>
                <p className="text-4xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {String(op.trips_created_count ?? 0)}
                </p>
                <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#7dffd4] mt-1">All time</p>
              </div>
              <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
                <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] mb-2">Last trip activity</p>
                <p className="text-xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {op.last_active_at ? new Date(op.last_active_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
              <p className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-[#475569] mb-2">Access</p>
              <p className="text-xs text-[#94a3b8]">
                Operators sign in with the phone and password you set. Use the toggle on the left to deactivate; trips they were assigned to become unassigned until you pick another operator on the trips page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
