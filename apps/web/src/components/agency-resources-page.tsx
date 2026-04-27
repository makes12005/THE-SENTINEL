'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui';
import { del, get, post, put } from '@/lib/api';

type Tab = 'buses' | 'conductors' | 'drivers';

interface Bus {
  id: string;
  number_plate: string;
  model: string | null;
  capacity: number | null;
  is_active: boolean;
  added_by_name?: string | null;
}

interface Member {
  id: string;
  name: string;
  phone: string | null;
  role: 'conductor' | 'driver';
  is_active: boolean;
  added_by_name?: string | null;
  trips_count?: number;
  last_active_at?: string | null;
}

function AddBusModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ number_plate: '', model: '', capacity: '40' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/api/agency/buses', {
      number_plate: form.number_plate,
      model: form.model || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-buses'] });
      toast.success('Bus created');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? 'Failed to create bus'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(); }} className="w-full max-w-md rounded-2xl border border-[#42474e]/40 bg-[#181c20] p-8">
        <h2 className="mb-6 text-xl font-black text-[#a3cbf2]">Add Bus</h2>
        <div className="space-y-4">
          <input required value={form.number_plate} onChange={(event) => setForm((current) => ({ ...current, number_plate: event.target.value.toUpperCase() }))} placeholder="Number plate" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          <input value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="Model" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          <input type="number" min="1" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} placeholder="Capacity" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          {error && <p className="text-sm text-[#ffb4ab]">{error.includes('already exists') ? `Bus ${form.number_plate} already exists` : error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#31353a] py-3 text-xs font-bold uppercase tracking-widest text-[#c2c7ce]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-[#a3cbf2] py-3 text-xs font-bold uppercase tracking-widest text-[#003353]">{mutation.isPending ? 'Saving...' : 'Add Bus'}</button>
        </div>
      </form>
    </div>
  );
}

function AddMemberModal({ role, onClose }: { role: 'conductor' | 'driver'; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/api/agency/members', { ...form, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-members'] });
      toast.success(`${role === 'conductor' ? 'Conductor' : 'Driver'} created`);
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message ?? `Failed to add ${role}`),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(); }} className="w-full max-w-md rounded-2xl border border-[#42474e]/40 bg-[#181c20] p-8">
        <h2 className="mb-6 text-xl font-black text-[#a3cbf2]">Add {role === 'conductor' ? 'Conductor' : 'Driver'}</h2>
        <div className="space-y-4">
          <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          <input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+919876543210" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          <input required type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" className="w-full rounded-xl border border-[#42474e] bg-[#1c2024] px-4 py-3 text-[#e0e2e8]" />
          {error && <p className="text-sm text-[#ffb4ab]">{error.includes('already exists') ? `${role === 'conductor' ? 'Conductor' : 'Driver'} with this phone exists` : error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#31353a] py-3 text-xs font-bold uppercase tracking-widest text-[#c2c7ce]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-[#a3cbf2] py-3 text-xs font-bold uppercase tracking-widest text-[#003353]">{mutation.isPending ? 'Saving...' : `Add ${role}`}</button>
        </div>
      </form>
    </div>
  );
}

export default function AgencyResourcesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('buses');
  const [showModal, setShowModal] = useState(false);

  const busesQuery = useQuery<Bus[]>({ queryKey: ['agency-buses'], queryFn: () => get('/api/agency/buses') });
  const membersQuery = useQuery<Member[]>({ queryKey: ['agency-members'], queryFn: () => get('/api/agency/members') });

  const toggleMember = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => put(`/api/agency/members/${id}/toggle`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-members'] });
      toast.success('Member status updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to update member'),
  });

  const deactivateBus = useMutation({
    mutationFn: (id: string) => del(`/api/agency/buses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-buses'] });
      toast.success('Bus deactivated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to deactivate bus'),
  });

  const members = membersQuery.data ?? [];
  const conductors = members.filter((member) => member.role === 'conductor');
  const drivers = members.filter((member) => member.role === 'driver');
  const rows = tab === 'buses' ? busesQuery.data ?? [] : tab === 'conductors' ? conductors : drivers;
  const isLoading = tab === 'buses' ? busesQuery.isLoading : membersQuery.isLoading;

  return (
    <div>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-gradient-to-b from-[#181c20] to-transparent px-8 backdrop-blur-sm">
        <PageHeader title="Resources" subtitle="Agency-wide shared resources" />
        <button onClick={() => setShowModal(true)} className="rounded-xl bg-[#a3cbf2] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#003353]">
          Add {tab === 'buses' ? 'Bus' : tab === 'conductors' ? 'Conductor' : 'Driver'}
        </button>
      </header>

      <div className="space-y-6 p-8">
        <div className="flex w-fit gap-2 rounded-xl bg-[#181c20] p-1.5">
          {(['buses', 'conductors', 'drivers'] as Tab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-widest ${tab === item ? 'bg-[#a3cbf2] text-[#003353]' : 'text-[#c2c7ce]'}`}>
              {item}
            </button>
          ))}
        </div>

        {isLoading ? <TableSkeleton rows={5} /> : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  {tab === 'buses' ? (
                    <>
                      <th className="px-6 pb-2">Plate</th>
                      <th className="px-6 pb-2">Model</th>
                      <th className="px-6 pb-2">Capacity</th>
                      <th className="px-6 pb-2">Added By</th>
                      <th className="px-6 pb-2">Status</th>
                      <th className="px-6 pb-2 text-right">Action</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 pb-2">Name</th>
                      <th className="px-6 pb-2">Phone</th>
                      <th className="px-6 pb-2">Trips</th>
                      <th className="px-6 pb-2">Last Active</th>
                      <th className="px-6 pb-2">Added By</th>
                      <th className="px-6 pb-2">Status</th>
                      <th className="px-6 pb-2 text-right">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === 'buses'
                  ? (busesQuery.data ?? []).map((bus) => (
                      <tr key={bus.id} className="bg-[#181c20]">
                        <td className="rounded-l-xl px-6 py-4 font-bold text-[#e0e2e8]">{bus.number_plate}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{bus.model || '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{bus.capacity ?? '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">Added by: {bus.added_by_name || 'Unknown'}</td>
                        <td className="px-6 py-4"><StatusBadge status={bus.is_active ? 'active' : 'completed'} /></td>
                        <td className="rounded-r-xl px-6 py-4 text-right">
                          {bus.is_active ? <button onClick={() => deactivateBus.mutate(bus.id)} className="text-xs uppercase tracking-wider text-[#ffb4ab]">Deactivate</button> : <span className="text-xs text-[#8c9198]">Inactive</span>}
                        </td>
                      </tr>
                    ))
                  : rows.map((member) => (
                      <tr key={member.id} className="bg-[#181c20]">
                        <td className="rounded-l-xl px-6 py-4 font-bold text-[#e0e2e8]">{(member as Member).name}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{(member as Member).phone || '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{(member as Member).trips_count ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{(member as Member).last_active_at ? new Date((member as Member).last_active_at as string).toLocaleString('en-IN') : '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">Added by: {(member as Member).added_by_name || 'Unknown'}</td>
                        <td className="px-6 py-4"><StatusBadge status={(member as Member).is_active ? 'active' : 'completed'} /></td>
                        <td className="rounded-r-xl px-6 py-4 text-right">
                          <button onClick={() => toggleMember.mutate({ id: (member as Member).id, is_active: !(member as Member).is_active })} className="text-xs uppercase tracking-wider text-[#a3cbf2]">
                            {(member as Member).is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={tab === 'buses' ? 6 : 7} className="rounded-xl bg-[#181c20] px-6 py-10 text-center text-sm text-[#8c9198]">
                      No {tab} found for this agency.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && tab === 'buses' && <AddBusModal onClose={() => setShowModal(false)} />}
      {showModal && tab === 'conductors' && <AddMemberModal role="conductor" onClose={() => setShowModal(false)} />}
      {showModal && tab === 'drivers' && <AddMemberModal role="driver" onClose={() => setShowModal(false)} />}
    </div>
  );
}
