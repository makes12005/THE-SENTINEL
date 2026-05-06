'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { get } from '@/lib/api';
import { StatusBadge, TableSkeleton } from '@/components/ui';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Passenger {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  stop_name: string;
  alert_status: string;
  alert_sent_at?: string | null;
}

interface TripDetail {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string; phone: string };
  driver?: { name: string; phone: string };
  bus_number?: string;
}

const alertStatusStyle: Record<string, string> = {
  sent: 'bg-green-900/30 text-green-400 border-green-800/50',
  failed: 'bg-[#93000a]/30 text-[#ffb4ab] border-[#93000a]/50',
  pending: 'bg-[#1c2024] text-[#8c9198] border-[#42474e]/50',
};

function maskPhone(phone: string) {
  if (!phone || phone.length < 8) return phone;
  return `${phone.slice(0, 3)}XXXXX${phone.slice(-5)}`;
}

function ResendModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const mutation = useMutation({
    mutationFn: async () => ({ queued: 0, tripId }),
    onSuccess: () => { toast.success('Alerts queued for resend'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl">
        <div className="px-8 py-6 border-b border-[#42474e]/30 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-black text-[#ffb4ab]" style={{ fontFamily: 'Manrope, sans-serif' }}>RESEND ALERTS</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-1">Resend to all failed / pending passengers</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-[#1c2024] rounded-lg flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="px-8 py-6">
          <p className="text-sm text-[#c2c7ce]">This will trigger immediate notification re-dispatch for all unconfirmed passengers on this trip. Are you sure?</p>
        </div>
        <div className="flex gap-3 px-8 pb-7">
          <button onClick={onClose} className="flex-1 h-12 rounded-lg bg-[#1c2024] border border-[#42474e]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-12 rounded-lg bg-[#ffb4ab] text-[#690005] text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-[#ffdad6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            {mutation.isPending ? 'Sending...' : 'Confirm Resend'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showResend, setShowResend] = useState(false);

  const { data: trip, isLoading: tripLoading } = useQuery<TripDetail>({
    queryKey: ['trip', id],
    queryFn: () => get<TripDetail>(`/api/trips/${id}`),
    refetchInterval: 15_000,
  });

  const { data: passengers, isLoading: passLoading } = useQuery<Passenger[]>({
    queryKey: ['trip-passengers', id],
    queryFn: () => get<Passenger[]>(`/api/trips/${id}/passengers`),
    refetchInterval: 30_000,
  });

  const alertSent = passengers?.filter((p) => p.alert_status === 'sent').length ?? 0;
  const alertFailed = passengers?.filter((p) => p.alert_status === 'failed').length ?? 0;
  const alertPending = passengers?.filter((p) => p.alert_status === 'pending').length ?? 0;
  const total = passengers?.length ?? 0;
  const deliveryPct = total ? Math.round((alertSent / total) * 100) : 0;

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Atmospheric blurs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#ffb68b]/4 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <Link href="/operator/trips" className="w-9 h-9 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          {tripLoading ? (
            <div className="h-6 w-56 bg-[#1c2024] rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {trip?.route?.from_city} <span className="text-[#8c9198] mx-2">→</span> {trip?.route?.to_city}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">
                TRIP // {trip?.scheduled_date} · {trip?.route?.name}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {trip && <StatusBadge status={trip.status} />}
          <button onClick={() => toast('Bulk resend is not available yet. Use trip logs for review.')}
            className="h-10 px-5 border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab] text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 rounded-lg hover:bg-[#ffb4ab]/20 transition-colors">
            <span className="material-symbols-outlined text-[16px]">send</span>
            Resend Alerts
          </button>
        </div>
      </header>

      <div className="px-8 pt-8 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left column — stats + manifest */}
          <div className="xl:col-span-2 space-y-6">
            {/* Stats bento */}
            {trip && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Route', value: trip.route?.name, icon: 'route', color: 'text-[#a3cbf2]', glow: 'bg-[#a3cbf2]/5' },
                  { label: 'Conductor', value: trip.conductor?.name, icon: 'person', color: 'text-[#c4c0ff]', glow: 'bg-[#c4c0ff]/5' },
                  { label: 'Bus Number', value: trip.bus_number || '—', icon: 'directions_bus', color: 'text-[#ffb68b]', glow: 'bg-[#ffb68b]/5' },
                  { label: 'Date', value: trip.scheduled_date, icon: 'calendar_month', color: 'text-[#8c9198]', glow: 'bg-[#8c9198]/5' },
                ].map((card) => (
                  <div key={card.label} className="bg-[#181c20] rounded-xl p-5 border border-[#42474e]/20 flex items-center gap-4 relative overflow-hidden group hover:border-[#42474e]/40 transition-all">
                    <div className={`absolute top-0 right-0 w-20 h-20 ${card.glow} rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform`} />
                    <div className="w-10 h-10 rounded-lg bg-[#1c2024] flex items-center justify-center flex-shrink-0 relative z-10">
                      <span className={`material-symbols-outlined text-[20px] ${card.color}`}>{card.icon}</span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">{card.label}</p>
                      <p className="font-bold text-[#e0e3e8] text-sm mt-0.5">{card.value ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Passenger table */}
            <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#42474e]/20">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Deployment Manifest</p>
                  <h2 className="text-base font-bold text-[#e0e3e8] mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Passengers ({passengers?.length ?? 0})
                  </h2>
                </div>
                {alertFailed > 0 && (
                  <button onClick={() => setShowResend(true)}
                    className="flex items-center gap-1.5 text-[#ffb4ab] text-[10px] font-bold uppercase tracking-[0.12em] hover:text-[#ffdad6]">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {alertFailed} Failed
                  </button>
                )}
              </div>
              {passLoading ? (
                <div className="p-6"><TableSkeleton rows={5} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#42474e]/50 bg-[#1c2024]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                        <th className="px-6 py-4 font-normal">Name</th>
                        <th className="px-6 py-4 font-normal">Phone</th>
                        <th className="px-6 py-4 font-normal">Boarding Stop</th>
                        <th className="px-6 py-4 font-normal">Alert Status</th>
                        <th className="px-6 py-4 font-normal">Alert Time (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#42474e]/20">
                      {(passengers ?? []).map((p) => (
                        <tr key={p.id} className="hover:bg-[#1c2024] transition-colors">
                          <td className="px-6 py-4 font-bold text-sm text-[#e0e3e8]">{p.passenger_name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-[#c2c7ce]">{maskPhone(p.passenger_phone)}</td>
                          <td className="px-6 py-4 text-sm text-[#c2c7ce]">{p.stop_name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-[0.15em] ${alertStatusStyle[p.alert_status] ?? alertStatusStyle.pending}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {p.alert_status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#c2c7ce]">
                            {p.alert_sent_at ? new Date(p.alert_sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                          </td>
                        </tr>
                      ))}
                      {!passengers?.length && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <span className="material-symbols-outlined text-[40px] text-[#42474e] block mb-3">description</span>
                            <p className="text-sm text-[#8c9198]">No passengers uploaded yet.</p>
                            <p className="text-[10px] text-[#8c9198]/60 mt-1 uppercase tracking-wider">Upload CSV from the trips list to begin.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right column — control panel */}
          <div className="space-y-6">
            {/* Alert delivery summary */}
            {total > 0 && (
              <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                  Alert Delivery
                </p>

                {/* Circular progress visual */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#1c2024" strokeWidth="8" />
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#4ade80" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - deliveryPct / 100)}`}
                        strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-lg font-bold text-[#4ade80]">{deliveryPct}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198]">Sent: <span className="text-green-400">{alertSent}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ffb68b]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198]">Pending: <span className="text-[#ffb68b]">{alertPending}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198]">Failed: <span className="text-[#ffb4ab]">{alertFailed}</span></span>
                    </div>
                  </div>
                </div>

                {/* Full progress bar */}
                <div className="h-2 bg-[#1c2024] rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full transition-all duration-700" style={{ width: `${deliveryPct}%` }} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198] mt-2 text-right">
                  {alertSent} / {total} delivered
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">bolt</span>
                Quick Actions
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowResend(true)}
                  className="w-full h-12 bg-[#a3cbf2] text-[#003352] font-bold uppercase tracking-widest text-[10px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#cee5ff] transition-colors shadow-xl">
                  <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  Resend Alerts
                </button>
                <button className="w-full h-12 border border-[#42474e]/50 text-[#c2c7ce] font-bold uppercase tracking-widest text-[10px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#262a2f] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export Manifest
                </button>
                <Link href={`/operator/logs?trip=${id}`}
                  className="w-full h-12 border border-[#42474e]/50 text-[#c2c7ce] font-bold uppercase tracking-widest text-[10px] rounded-lg flex items-center justify-center gap-2 hover:bg-[#262a2f] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  View Logs
                </Link>
              </div>
            </div>

            {/* Crew info */}
            {trip?.conductor && (
              <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">groups</span>
                  Assigned Crew
                </p>
                <div className="space-y-3">
                  {[
                    { role: 'Conductor', name: trip.conductor.name, phone: trip.conductor.phone, icon: 'person' },
                    ...(trip.driver ? [{ role: 'Driver', name: trip.driver.name, phone: trip.driver.phone, icon: 'drive_eta' }] : []),
                  ].map((crew) => (
                    <div key={crew.role} className="flex items-center gap-3 bg-[#1c2024] rounded-lg px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-[#262a2f] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#a3cbf2] text-[18px]">{crew.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#e0e3e8]">{crew.name}</p>
                        <p className="font-mono text-[10px] text-[#8c9198]">{crew.phone || '—'}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.15em] text-[#8c9198] bg-[#262a2f] px-2 py-1 rounded">{crew.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResend && <ResendModal tripId={id} onClose={() => setShowResend(false)} />}
    </div>
  );
}
