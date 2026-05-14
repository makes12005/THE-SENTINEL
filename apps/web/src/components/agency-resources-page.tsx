'use client';

import { useState, useMemo } from 'react';
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
  upcoming_trip?: {
    id: string;
    scheduled_date: string | null;
    status: string | null;
  } | null;
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

  const inp = 'w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-3 text-[#e0e3e8] text-sm placeholder-[#8c9198] focus:outline-none focus:border-[#a3cbf2]/50 transition-colors';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(); }} className="w-full max-w-md rounded-xl border border-[#42474e]/40 bg-[#181c20] overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#42474e]/30">
          <div>
            <h2 className="text-lg font-black text-[#cee5ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>ADD BUS</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Register fleet unit</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="px-8 py-6 space-y-4">
          <input required value={form.number_plate} onChange={(event) => setForm((current) => ({ ...current, number_plate: event.target.value.toUpperCase() }))} placeholder="Number plate" className={inp} />
          <input value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="Model (optional)" className={inp} />
          <input type="number" min="1" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} placeholder="Capacity" className={inp} />
          {error && <p className="text-xs text-[#ffb4ab]">{error.includes('already exists') ? `Bus ${form.number_plate} already exists` : error}</p>}
        </div>
        <div className="flex gap-3 px-8 pb-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-all">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-lg bg-[#a3cbf2] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] hover:bg-[#cee5ff] disabled:opacity-50 transition-all">{mutation.isPending ? 'Saving...' : 'Add Bus'}</button>
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

  const inp = 'w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-3 text-[#e0e3e8] text-sm placeholder-[#8c9198] focus:outline-none focus:border-[#a3cbf2]/50 transition-colors';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(); }} className="w-full max-w-md rounded-xl border border-[#42474e]/40 bg-[#181c20] overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#42474e]/30">
          <div>
            <h2 className="text-lg font-black text-[#cee5ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>ADD {role === 'conductor' ? 'CONDUCTOR' : 'DRIVER'}</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Register crew member</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="px-8 py-6 space-y-4">
          <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className={inp} />
          <input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+919876543210" className={inp} />
          <input required type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" className={inp} />
          {error && <p className="text-xs text-[#ffb4ab]">{error.includes('already exists') ? `${role === 'conductor' ? 'Conductor' : 'Driver'} with this phone exists` : error}</p>}
        </div>
        <div className="flex gap-3 px-8 pb-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-all">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-lg bg-[#a3cbf2] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] hover:bg-[#cee5ff] disabled:opacity-50 transition-all">{mutation.isPending ? 'Saving...' : `Add ${role === 'conductor' ? 'Conductor' : 'Driver'}`}</button>
        </div>
      </form>
    </div>
  );
}

export default function AgencyResourcesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('buses');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

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
  const conductors = members.filter((m) => m.role === 'conductor');
  const drivers = members.filter((m) => m.role === 'driver');
  const rawRows = tab === 'buses' ? busesQuery.data ?? [] : tab === 'conductors' ? conductors : drivers;
  const rows = useMemo(() => {
    if (!search.trim()) return rawRows;
    const q = search.toLowerCase();
    return rawRows.filter((r: any) =>
      (r.name ?? r.number_plate ?? '').toLowerCase().includes(q) ||
      (r.phone ?? '').toLowerCase().includes(q)
    );
  }, [rawRows, search]);
  const isLoading = tab === 'buses' ? busesQuery.isLoading : membersQuery.isLoading;

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>FLEET HQ</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Agency-wide shared resources</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9198] text-[16px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="bg-[#1c2024] border border-[#42474e]/60 rounded-lg pl-9 pr-4 h-10 text-[#e0e3e8] text-xs focus:outline-none focus:border-[#a3cbf2]/50 transition-all w-48 placeholder:text-[#42474e]"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-[#a3cbf2] hover:bg-[#cee5ff] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] transition-colors shadow-lg">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add {tab === 'buses' ? 'Bus' : tab === 'conductors' ? 'Conductor' : 'Driver'}
          </button>
        </div>
      </header>

      <div className="space-y-6 px-8 pt-8 max-w-7xl mx-auto relative z-10">
        <div className="flex gap-2 border-b border-[#42474e]/30">
          {(['buses', 'conductors', 'drivers'] as Tab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.15em] border-b-2 transition-all ${tab === item ? 'text-[#a3cbf2] border-[#a3cbf2]' : 'text-[#8c9198] border-transparent hover:text-[#c2c7ce]'}`}>
              {item}
            </button>
          ))}
        </div>

        {isLoading ? <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6"><TableSkeleton rows={5} /></div> : (
          <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#42474e]/50 bg-[#1c2024]/50 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
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
                      <th className="px-6 pb-2">Duty Status</th>
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
                      <tr key={bus.id} className="group border-b border-[#ffffff0a] hover:bg-[#1c2024] transition-colors">
                        <td className="px-6 py-4 font-bold text-[#e0e2e8]">{bus.number_plate}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{bus.model || '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">{bus.capacity ?? '—'}</td>
                        <td className="px-6 py-4 text-sm text-[#c2c7ce]">Added by: {bus.added_by_name || 'Unknown'}</td>
                        <td className="px-6 py-4"><StatusBadge status={bus.is_active ? 'active' : 'completed'} /></td>
                        <td className="px-6 py-4 text-right">
                          {bus.is_active ? <button onClick={() => deactivateBus.mutate(bus.id)} className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#ffb4ab] hover:text-[#ff897d] transition-colors">Deactivate</button> : <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Inactive</span>}
                        </td>
                      </tr>
                    ))
                  : rows.map((member) => {
                      const m = member as Member;
                      const hasDutyConflict = !!m.upcoming_trip;
                      return (
                        <tr key={m.id} className="group border-b border-[#ffffff0a] hover:bg-[#1c2024] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#e0e2e8]">{m.name}</span>
                              {hasDutyConflict && (
                                <span
                                  title={`On duty: trip scheduled ${m.upcoming_trip?.scheduled_date}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#FF7A00]/15 border border-[#FF7A00]/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#FF7A00]"
                                >
                                  <span className="material-symbols-outlined text-[11px]">warning</span>
                                  On Duty
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#c2c7ce]">{m.phone || '—'}</td>
                          <td className="px-6 py-4 text-sm text-[#c2c7ce]">{m.trips_count ?? 0}</td>
                          <td className="px-6 py-4 text-sm text-[#c2c7ce]">{m.last_active_at ? new Date(m.last_active_at).toLocaleString('en-IN') : '—'}</td>
                          <td className="px-6 py-4">
                            {hasDutyConflict ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#FF7A00]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
                                Duty in 12h
                              </span>
                            ) : (
                              <span className="text-[0.625rem] text-[#42474e] uppercase tracking-wider">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#c2c7ce]">{m.added_by_name || 'Unknown'}</td>
                          <td className="px-6 py-4"><StatusBadge status={m.is_active ? 'active' : 'completed'} /></td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => toggleMember.mutate({ id: m.id, is_active: !m.is_active })} className={`text-[0.625rem] font-bold uppercase tracking-[0.15em] transition-colors ${m.is_active ? 'text-[#ffb4ab] hover:text-[#ff897d]' : 'text-[#a3cbf2] hover:text-[#8ab4f8]'}`}>
                              {m.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                {!rows.length && (
                  <tr>
                    <td colSpan={tab === 'buses' ? 6 : 9} className="rounded-xl bg-[#181c20] px-6 py-10 text-center text-sm text-[#8c9198]">
                      No {tab} found{search ? ` matching "${search}"` : ' for this agency'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showModal && tab === 'buses' && <AddBusModal onClose={() => setShowModal(false)} />}
      {showModal && tab === 'conductors' && <AddMemberModal role="conductor" onClose={() => setShowModal(false)} />}
      {showModal && tab === 'drivers' && <AddMemberModal role="driver" onClose={() => setShowModal(false)} />}
    </div>
  );
}
