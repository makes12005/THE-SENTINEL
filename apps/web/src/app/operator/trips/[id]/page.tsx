'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { get } from '@/lib/api';
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui';
import Link from 'next/link';

interface Passenger {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  stop_name: string;
  alert_status: string;
}

interface TripDetail {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string; phone: string };
  driver?: { name: string; phone: string };
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: trip, isLoading: tripLoading } = useQuery<TripDetail>({
    queryKey: ['trip', id],
    queryFn:  () => get<TripDetail>(`/api/trips/${id}/status`),
    refetchInterval: 15_000,
  });

  const { data: passengers, isLoading: passLoading } = useQuery<Passenger[]>({
    queryKey: ['trip-passengers', id],
    queryFn:  () => get<Passenger[]>(`/api/trips/${id}/passengers`),
    refetchInterval: 30_000,
  });

  const alertCount = passengers?.filter((p) => p.alert_status === 'sent').length ?? 0;
  const failCount  = passengers?.filter((p) => p.alert_status === 'failed').length ?? 0;

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <Link href="/operator/trips" className="text-[#c2c7ce] opacity-60 hover:opacity-100">
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <PageHeader
          title={tripLoading ? 'Loading…' : `${trip?.route?.from_city} → ${trip?.route?.to_city}`}
          subtitle={trip?.scheduled_date}
        />
        {trip && <div className="ml-auto"><StatusBadge status={trip.status} /></div>}
      </header>

      <div className="p-8 space-y-8">
        {/* Info cards */}
        {trip && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Route',       value: trip.route?.name,          icon: 'route' },
              { label: 'Conductor',   value: trip.conductor?.name,       icon: 'person' },
              { label: 'Alerts Sent', value: String(alertCount),         icon: 'notifications' },
              { label: 'Failed',      value: String(failCount),          icon: 'error' },
            ].map((card) => (
              <div key={card.label} className="bg-[#181c20] rounded-xl p-5 flex items-center gap-4">
                <span className="material-symbols-outlined text-2xl text-[#a3cbf2]">{card.icon}</span>
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">{card.label}</p>
                  <p className="font-bold text-[#e0e2e8] text-sm mt-0.5">{card.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passenger table */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Passengers ({passengers?.length ?? 0})
            </h2>
          </div>
          {passLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                    <th className="px-6 pb-2">Name</th>
                    <th className="px-6 pb-2">Phone</th>
                    <th className="px-6 pb-2">Stop</th>
                    <th className="px-6 pb-2">Alert Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(passengers ?? []).map((p) => (
                    <tr key={p.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
                      <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">{p.passenger_name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-[#c2c7ce]">{p.passenger_phone}</td>
                      <td className="px-6 py-4 text-sm text-[#c2c7ce]">{p.stop_name}</td>
                      <td className="px-6 py-4 rounded-r-xl"><StatusBadge status={p.alert_status ?? 'pending'} /></td>
                    </tr>
                  ))}
                  {!passengers?.length && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                        No passengers yet. Upload CSV from Trips list.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
