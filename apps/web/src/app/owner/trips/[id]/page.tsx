'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format-ist';
import { StatusBadge } from '@/components/shared';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TripPassenger {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  alert_status: string;
  alert_sent_at?: string | null;
}

interface TripDetail {
  id: string;
  status: string;
  scheduled_date: string;
  started_at?: string | null;
  completed_at?: string | null;
  route?: { name?: string; from_city?: string; to_city?: string };
  conductor?: { id: string; name: string };
  assigned_operator?: { id: string; name: string } | null;
  trip_owner_operator?: { id: string; name: string } | null;
  passengers: TripPassenger[];
}

function DeleteModal({ tripId, onConfirm, onClose, isDeleting }: { tripId: string; onConfirm: () => void; onClose: () => void; isDeleting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl">
        <div className="px-6 py-5 border-b border-[#42474e]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#93000a]/20 flex items-center justify-center">
              <Trash2 size={20} color="#ffb4ab" />
            </div>
            <h2 className="text-lg font-black text-[#ffb4ab]" style={{ fontFamily: 'Manrope, sans-serif' }}>DELETE TRIP</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-[#c2c7ce]">Are you sure you want to delete this trip? This action cannot be undone.</p>
          <div className="mt-4 p-3 rounded-lg bg-[#93000a]/10 border border-[#93000a]/30">
            <p className="text-xs text-[#ffb4ab]">All passenger data and alert history will be permanently removed.</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={isDeleting} className="flex-1 h-11 rounded-lg bg-[#1c2024] border border-[#42474e]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 h-11 rounded-lg bg-[#ffb4ab] text-[#690005] text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-[#ffdad6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            {isDeleting ? 'Deleting...' : 'Delete Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const trip = useQuery<TripDetail>({
    queryKey: ['owner-trip-detail', id],
    queryFn: () => get(`/api/trips/${id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/api/trips/${id}`),
    onSuccess: () => {
      toast.success('Trip deleted successfully');
      qc.invalidateQueries({ queryKey: ['owner-trips'] });
      router.push('/owner/trips');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to delete trip';
      toast.error(msg);
    },
  });

  if (trip.isLoading) {
    return <div className="min-h-screen bg-[#0F172A] p-6 animate-pulse" />;
  }

  if (trip.isError || !trip.data) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] p-6">
        <p className="text-sm text-[#ffb4ab]">Unable to load trip detail.</p>
        <Link href="/owner/trips" className="mt-3 inline-block text-[#6C63FF] underline">
          Back to trips
        </Link>
      </div>
    );
  }

  const t = trip.data;
  const sent = t.passengers.filter((p) => p.alert_status === 'sent').length;
  const failed = t.passengers.filter((p) => p.alert_status === 'failed').length;
  const pending = t.passengers.filter((p) => p.alert_status === 'pending').length;
  
  const canDelete = t.status === 'scheduled' || t.status === 'expired';
  const isExpired = t.status === 'expired' || (t.status === 'scheduled' && new Date(t.scheduled_date) < new Date());

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-[#475569]">
              <Link href="/owner/trips" className="hover:text-[#F1F5F9] uppercase tracking-widest">
                Trips
              </Link>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="uppercase tracking-widest text-[#94a3b8]">{id}</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-wide text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {t.route?.from_city ?? '—'} <span className="text-[#6C63FF]">→</span> {t.route?.to_city ?? '—'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {canDelete && (
              <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#93000a]/20 border border-[#93000a]/40 text-[#ffb4ab] text-[10px] font-bold uppercase tracking-widest hover:bg-[#93000a]/30 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            )}
            <StatusBadge status={t.status} />
          </div>
        </div>

        {isExpired && t.status !== 'completed' && (
          <div className="rounded-xl border border-[#93000a]/30 bg-gradient-to-r from-[#93000a]/10 to-[#93000a]/5 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#93000a]/20 flex items-center justify-center">
              <AlertTriangle size={20} color="#ffb4ab" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#ffb4ab]">Trip Schedule Passed</p>
              <p className="text-xs text-[#8c9198] mt-1">This trip was scheduled for {t.scheduled_date} but has not started.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
            <h2 className="mb-4 text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Trip Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Route name</p>
                <p>{t.route?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Scheduled date</p>
                <p className={isExpired ? 'text-[#ffb4ab]' : ''}>{t.scheduled_date}</p>
              </div>
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Assigned operator</p>
                <p>{t.assigned_operator?.name ?? 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Conductor</p>
                <p>{t.conductor?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Started at (IST)</p>
                <p>{formatIstDateTime(t.started_at)}</p>
              </div>
              <div>
                <p className="text-[0.5625rem] text-[#475569] uppercase tracking-widest">Completed at (IST)</p>
                <p>{formatIstDateTime(t.completed_at)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
            <h2 className="mb-4 text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Alert Progress</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#1e293b] bg-[#0F172A] p-4">
                <p className="text-[0.5625rem] uppercase tracking-widest text-[#475569]">Sent</p>
                <p className="text-2xl font-black text-[#7dffd4]">{sent}</p>
              </div>
              <div className="rounded-xl border border-[#1e293b] bg-[#0F172A] p-4">
                <p className="text-[0.5625rem] uppercase tracking-widest text-[#475569]">Failed</p>
                <p className="text-2xl font-black text-[#FF7A00]">{failed}</p>
              </div>
              <div className="rounded-xl border border-[#1e293b] bg-[#0F172A] p-4">
                <p className="text-[0.5625rem] uppercase tracking-widest text-[#475569]">Pending</p>
                <p className="text-2xl font-black text-[#a3cbf2]">{pending}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
          <h2 className="mb-4 text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Passengers</h2>
          {t.passengers.length === 0 ? (
            <p className="text-sm text-[#475569]">No passengers on this trip.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[0.6875rem] uppercase tracking-widest text-[#8c9198]">
                    <th className="px-4">Name</th>
                    <th className="px-4">Phone</th>
                    <th className="px-4">Alert status</th>
                    <th className="px-4">Sent at (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {t.passengers.map((p) => (
                    <tr key={p.id} className="bg-[#181c20]">
                      <td className="rounded-l-xl px-4 py-3">{p.passenger_name}</td>
                      <td className="px-4 py-3">{p.passenger_phone}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.alert_status === 'sent' ? 'active' : p.alert_status === 'pending' ? 'scheduled' : 'completed'} />
                      </td>
                      <td className="rounded-r-xl px-4 py-3">{formatIstDateTime(p.alert_sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showDeleteModal && (
        <DeleteModal tripId={id} onConfirm={() => deleteMutation.mutate()} onClose={() => setShowDeleteModal(false)} isDeleting={deleteMutation.isPending} />
      )}
    </div>
  );
}
