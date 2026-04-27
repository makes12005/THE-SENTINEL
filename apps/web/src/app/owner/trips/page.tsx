'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui';
import { get, put } from '@/lib/api';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  owner_name?: string | null;
  assigned_operator_name?: string | null;
  assigned_operator_id?: string | null;
  route: { name: string; from_city: string; to_city: string };
  passenger_count: number;
}

interface Operator { id: string; name: string; is_active: boolean }

function ReassignTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [assignedOperatorId, setAssignedOperatorId] = useState(trip.assigned_operator_id ?? '');
  const operators = useQuery<Operator[]>({ queryKey: ['agency-operators'], queryFn: () => get('/api/agency/operators') });

  const mutation = useMutation({
    mutationFn: () => put(`/api/trips/${trip.id}/reassign`, { assigned_operator_id: assignedOperatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-trips'] });
      queryClient.invalidateQueries({ queryKey: ['owner-summary'] });
      toast.success('Trip reassigned');
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to reassign trip'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="w-full max-w-md rounded-2xl border border-[#42474e]/40 bg-[#181c20] p-8"
      >
        <h2 className="mb-3 text-xl font-black text-[#c4c0ff]">Reassign Trip</h2>
        <p className="mb-4 text-sm text-[#c2c7ce]">Current operator: {trip.assigned_operator_name || 'Unassigned'}</p>
        <select required value={assignedOperatorId} onChange={(event) => setAssignedOperatorId(event.target.value)} className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
          <option value="">Select operator</option>
          {(operators.data ?? []).filter((operator) => operator.is_active).map((operator) => (
            <option key={operator.id} value={operator.id}>{operator.name}</option>
          ))}
        </select>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#31353a] py-3 text-xs font-bold uppercase tracking-widest text-[#c2c7ce]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-[#c4c0ff] py-3 text-xs font-bold uppercase tracking-widest text-[#2000a4]">
            {mutation.isPending ? 'Saving...' : 'Confirm Reassign'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OwnerTripsPage() {
  const searchParams = useSearchParams();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const unassigned = searchParams.get('unassigned') === 'true';

  const trips = useQuery<Trip[]>({
    queryKey: ['owner-trips', unassigned],
    queryFn: () => get(`/api/owner/trips${unassigned ? '?unassigned=true' : ''}`),
    refetchInterval: 30000,
  });

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-gradient-to-b from-[#181c20] to-transparent px-8 backdrop-blur-sm">
        <PageHeader title="All Trips" subtitle={unassigned ? 'Unassigned trips' : 'Agency-wide trips'} />
      </header>

      <div className="p-8">
        {trips.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  <th className="px-6 pb-2">Route</th>
                  <th className="px-6 pb-2">Owner</th>
                  <th className="px-6 pb-2">Assigned To</th>
                  <th className="px-6 pb-2">Passengers</th>
                  <th className="px-6 pb-2">Date</th>
                  <th className="px-6 pb-2">Status</th>
                  <th className="px-6 pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(trips.data ?? []).map((trip) => (
                  <tr key={trip.id} className="bg-[#181c20]">
                    <td className="rounded-l-xl px-6 py-4 font-bold text-[#e0e2e8]">{trip.route.from_city} to {trip.route.to_city}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.owner_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.assigned_operator_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.passenger_count ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.scheduled_date}</td>
                    <td className="px-6 py-4"><StatusBadge status={trip.status} /></td>
                    <td className="rounded-r-xl px-6 py-4 text-right">
                      <button onClick={() => setSelectedTrip(trip)} className="text-xs uppercase tracking-wider text-[#c4c0ff]">
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTrip && <ReassignTripModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
    </div>
  );
}
