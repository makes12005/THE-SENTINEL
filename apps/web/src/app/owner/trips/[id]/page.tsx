'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format-ist';
import { StatusBadge } from '@/components/shared';

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

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const trip = useQuery<TripDetail>({
    queryKey: ['owner-trip-detail', id],
    queryFn: () => get(`/api/trips/${id}`),
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
          <StatusBadge status={t.status} />
        </div>

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
                <p>{t.scheduled_date}</p>
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
    </div>
  );
}
