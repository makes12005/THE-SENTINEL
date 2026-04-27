'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui';
import { getSocket } from '@/lib/socket';
import { get, post, put } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  bus_number: string | null;
  passenger_count: number;
  owned_by_operator_id: string;
  assigned_operator_id: string | null;
  assigned_operator_name?: string | null;
}

interface Route { id: string; name: string; from_city: string; to_city: string }
interface Member { id: string; name: string; role: 'conductor' | 'driver'; is_active: boolean }
interface Operator { id: string; name: string; is_active: boolean }
interface Bus { id: string; number_plate: string; is_active: boolean }

function CreateTripModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    route_id: '',
    conductor_id: '',
    driver_id: '',
    bus_id: '',
    scheduled_date: '',
    assigned_operator_id: '',
  });

  const routes = useQuery<Route[]>({ queryKey: ['routes'], queryFn: () => get('/api/routes') });
  const members = useQuery<Member[]>({ queryKey: ['agency-members'], queryFn: () => get('/api/agency/members') });
  const operators = useQuery<Operator[]>({ queryKey: ['agency-operators'], queryFn: () => get('/api/agency/operators') });
  const buses = useQuery<Bus[]>({ queryKey: ['agency-buses'], queryFn: () => get('/api/agency/buses') });

  const mutation = useMutation({
    mutationFn: () => post('/api/trips', {
      route_id: form.route_id,
      conductor_id: form.conductor_id,
      driver_id: form.driver_id || undefined,
      bus_id: form.bus_id || undefined,
      scheduled_date: form.scheduled_date,
      assigned_operator_id: form.assigned_operator_id || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created');
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create trip'),
  });

  const conductors = (members.data ?? []).filter((member) => member.role === 'conductor' && member.is_active);
  const drivers = (members.data ?? []).filter((member) => member.role === 'driver' && member.is_active);
  const activeOperators = (operators.data ?? []).filter((operator) => operator.is_active);
  const activeBuses = (buses.data ?? []).filter((bus) => bus.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="w-full max-w-xl rounded-2xl border border-[#42474e]/40 bg-[#181c20] p-8"
      >
        <h2 className="mb-6 text-xl font-black text-[#a3cbf2]">Create Trip</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <select required value={form.route_id} onChange={(event) => setForm((current) => ({ ...current, route_id: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
            <option value="">Select route</option>
            {(routes.data ?? []).map((route) => <option key={route.id} value={route.id}>{route.name} ({route.from_city} to {route.to_city})</option>)}
          </select>
          <input required type="date" value={form.scheduled_date} onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          <select required value={form.conductor_id} onChange={(event) => setForm((current) => ({ ...current, conductor_id: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
            <option value="">Select conductor</option>
            {conductors.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <select value={form.driver_id} onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
            <option value="">Select driver (optional)</option>
            {drivers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <select value={form.assigned_operator_id} onChange={(event) => setForm((current) => ({ ...current, assigned_operator_id: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
            <option value="">{user?.name ? `Myself (${user.name})` : 'Myself'}</option>
            {activeOperators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}
          </select>
          <select value={form.bus_id} onChange={(event) => setForm((current) => ({ ...current, bus_id: event.target.value }))} className="rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
            <option value="">Select bus (optional)</option>
            {activeBuses.map((bus) => <option key={bus.id} value={bus.id}>{bus.number_plate}</option>)}
          </select>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#31353a] py-3 text-xs font-bold uppercase tracking-widest text-[#c2c7ce]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-[#a3cbf2] py-3 text-xs font-bold uppercase tracking-widest text-[#003353]">
            {mutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReassignTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const qc = useQueryClient();
  const [assignedOperatorId, setAssignedOperatorId] = useState(trip.assigned_operator_id ?? '');
  const operators = useQuery<Operator[]>({ queryKey: ['agency-operators'], queryFn: () => get('/api/agency/operators') });

  const mutation = useMutation({
    mutationFn: () => put(`/api/trips/${trip.id}/reassign`, { assigned_operator_id: assignedOperatorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
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
        <h2 className="mb-3 text-xl font-black text-[#a3cbf2]">Reassign Trip</h2>
        <p className="mb-4 text-sm text-[#c2c7ce]">Current operator: {trip.assigned_operator_name || 'Unassigned'}</p>
        <select required value={assignedOperatorId} onChange={(event) => setAssignedOperatorId(event.target.value)} className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]">
          <option value="">Select operator</option>
          {(operators.data ?? []).filter((operator) => operator.is_active).map((operator) => (
            <option key={operator.id} value={operator.id}>{operator.name}</option>
          ))}
        </select>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#31353a] py-3 text-xs font-bold uppercase tracking-widest text-[#c2c7ce]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-[#a3cbf2] py-3 text-xs font-bold uppercase tracking-widest text-[#003353]">
            {mutation.isPending ? 'Saving...' : 'Confirm Reassign'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TripsPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const queryClient = useQueryClient();

  const trips = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => get('/api/trips'),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: { tripName: string; assignedBy: string }) => {
      toast.success(`Trip ${payload.tripName} has been assigned to you by ${payload.assignedBy}`);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    };

    socket.on('trip_assigned', handler);
    return () => {
      socket.off('trip_assigned', handler);
    };
  }, [queryClient]);

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-gradient-to-b from-[#181c20] to-transparent px-8 backdrop-blur-sm">
        <PageHeader title="Trips" subtitle={`${trips.data?.length ?? 0} visible trips`} />
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-[#a3cbf2] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#003353]">
          Create Trip
        </button>
      </header>

      <div className="p-8">
        {trips.isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  <th className="px-6 pb-2">Route</th>
                  <th className="px-6 pb-2">Bus</th>
                  <th className="px-6 pb-2">Conductor</th>
                  <th className="px-6 pb-2">Assigned To</th>
                  <th className="px-6 pb-2">Passengers</th>
                  <th className="px-6 pb-2">Date</th>
                  <th className="px-6 pb-2">Status</th>
                  <th className="px-6 pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(trips.data ?? []).map((trip) => (
                  <tr key={trip.id} className="bg-[#181c20]">
                    <td className="rounded-l-xl px-6 py-4 font-bold text-[#e0e2e8]">{trip.route.from_city} to {trip.route.to_city}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.bus_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.conductor.name}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.assigned_operator_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.passenger_count ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.scheduled_date}</td>
                    <td className="px-6 py-4"><StatusBadge status={trip.status} /></td>
                    <td className="rounded-r-xl px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        {user?.id === trip.owned_by_operator_id && (
                          <button onClick={() => setSelectedTrip(trip)} className="text-xs uppercase tracking-wider text-[#c4c0ff]">
                            Reassign
                          </button>
                        )}
                        <Link href={`/operator/trips/${trip.id}`} className="text-xs uppercase tracking-wider text-[#a3cbf2]">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
      {selectedTrip && <ReassignTripModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
    </div>
  );
}
