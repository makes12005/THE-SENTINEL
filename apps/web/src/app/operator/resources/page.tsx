'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { TableSkeleton, PageHeader, StatusBadge } from '@/components/ui';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  name: string;
  phone: string;
  role: 'conductor' | 'driver';
  is_active: boolean;
  created_at: string;
}

type Tab = 'conductor' | 'driver';

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'conductor' });

  const create = useMutation({
    mutationFn: (body: typeof form) => post('/api/agency/members', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member added');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to add member'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#181c20] w-full max-w-md rounded-2xl shadow-2xl p-8 border border-[#42474e]/30">
        <h2 className="text-xl font-black text-[#a3cbf2] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Add Member
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          {[
            { label: 'Full Name', key: 'name',     type: 'text',     placeholder: 'Ramesh Patel' },
            { label: 'Phone',     key: 'phone',    type: 'tel',      placeholder: '+919876543210' },
            { label: 'Password',  key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">{label} *</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
              />
            </div>
          ))}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">Role *</label>
            <div className="flex gap-3">
              {['conductor', 'driver'].map((r) => (
                <button
                  key={r} type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                    form.role === r
                      ? 'border-[#a3cbf2] bg-[#a3cbf2]/10 text-[#a3cbf2]'
                      : 'border-[#42474e] text-[#c2c7ce] hover:border-[#8c9198]'
                  }`}
                >{r}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-[#a3cbf2] text-[#003353] hover:brightness-110 disabled:opacity-50 transition-all">
              {create.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [tab,       setTab]       = useState<Tab>('conductor');
  const [showModal, setShowModal] = useState(false);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn:  () => get<Member[]>('/api/agency/members'),
  });

  const filtered = (members ?? []).filter((m) => m.role === tab);

  return (
    <div>
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Resources" subtitle="Conductors & Drivers" />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add Member
        </button>
      </header>

      <div className="p-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 bg-[#181c20] rounded-xl p-1.5 w-fit">
          {(['conductor', 'driver'] as Tab[]).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-[#a3cbf2] text-[#003353]'
                  : 'text-[#c2c7ce] opacity-60 hover:opacity-100'
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >{t}s</button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="bg-[#181c20] p-5 rounded-xl border-l-4 border-[#a3cbf2]">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60 mb-1">Total</p>
            <p className="text-3xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {String(filtered.length).padStart(2, '0')}
            </p>
          </div>
          <div className="bg-[#181c20] p-5 rounded-xl border-l-4 border-[#c4c0ff]">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60 mb-1">Active</p>
            <p className="text-3xl font-black text-[#c4c0ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {String(filtered.filter((m) => m.is_active).length).padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  <th className="px-6 pb-2">Name</th>
                  <th className="px-6 pb-2">Phone</th>
                  <th className="px-6 pb-2">Joined</th>
                  <th className="px-6 pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
                    <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0b3c5d] flex items-center justify-center text-[#a3cbf2] text-sm font-black">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        {m.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#c2c7ce]">{m.phone}</td>
                    <td className="px-6 py-4 text-xs font-mono text-[#8c9198]">
                      {new Date(m.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 rounded-r-xl">
                      <StatusBadge status={m.is_active ? 'active' : 'completed'} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                      No {tab}s yet. Add your first member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <AddMemberModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
