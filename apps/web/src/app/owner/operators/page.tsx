'use client';
/**
 * Owner — Screen 2: Operator Management
 * List all operators in the agency, toggle active/inactive, add new operator.
 * Data: GET /api/owner/operators, POST /api/owner/operators, POST /api/owner/operators/:id/toggle
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { TableSkeleton, PageHeader } from '@/components/ui';
import { MemberCard, type MemberRow } from '@/components/shared';
import toast from 'react-hot-toast';

export default function OwnerOperatorsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', phone: '+91', password: '' });
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');

  const { data: operators, isLoading } = useQuery<MemberRow[]>({
    queryKey: ['owner-operators'],
    queryFn:  () => get<MemberRow[]>('/api/owner/operators'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }: { id: string; current: boolean }) =>
      post(`/api/owner/operators/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => post('/api/owner/operators', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      setShowAdd(false);
      setForm({ name: '', phone: '+91', password: '' });
      toast.success('Operator created');
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create operator'),
    onSettled: () => setSaving(false),
  });

  const filtered = (operators ?? []).filter((op) =>
    op.name.toLowerCase().includes(search.toLowerCase()) ||
    op.phone.includes(search)
  );

  const active   = filtered.filter((o) => o.is_active).length;
  const inactive = filtered.filter((o) => !o.is_active).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    addMutation.mutate(form);
  };

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Operators" subtitle="Manage agency operators" />
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#c4c0ff] text-[#2000a4] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Operator
        </button>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',    value: filtered.length, color: 'text-[#c4c0ff]' },
            { label: 'Active',   value: active,          color: 'text-[#7dffd4]' },
            { label: 'Inactive', value: inactive,        color: 'text-[#ffb4ab]' },
          ].map((s) => (
            <div key={s.label} className="bg-[#181c20] p-5 rounded-xl text-center">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                {String(s.value).padStart(2, '0')}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-[#181c20] px-4 rounded-xl border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[20px] text-[#8c9198]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="flex-1 bg-transparent py-3 text-sm text-[#e0e2e8] placeholder-[#8c9198] outline-none"
          />
        </div>

        {/* List */}
        {isLoading
          ? <TableSkeleton rows={3} />
          : (
            <div className="space-y-3">
              {filtered.map((op) => (
                <MemberCard
                  key={op.id}
                  member={op}
                  onToggle={(id, current) => toggleMutation.mutate({ id, current })}
                />
              ))}
              {!filtered.length && (
                <div className="py-16 text-center text-[#8c9198] bg-[#181c20] rounded-xl">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">manage_accounts</span>
                  <p className="text-sm">No operators found. Add one to get started.</p>
                </div>
              )}
            </div>
          )
        }
      </div>

      {/* Add Operator Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c2024] rounded-2xl p-8 w-full max-w-md shadow-2xl border border-[#42474e]/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Add Operator
              </h2>
              <button onClick={() => setShowAdd(false)} className="text-[#8c9198] hover:text-[#e0e2e8]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {[
                { label: 'Full Name',  key: 'name',     type: 'text',     placeholder: 'Rajesh Kumar' },
                { label: 'Phone',      key: 'phone',    type: 'tel',      placeholder: '+919876543210' },
                { label: 'Password',   key: 'password', type: 'password', placeholder: '••••••••' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2 block">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-[#101418] border border-[#42474e]/40 rounded-xl px-4 py-3 text-sm text-[#e0e2e8] placeholder-[#8c9198] outline-none focus:border-[#c4c0ff] transition-colors"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#c4c0ff] text-[#2000a4] font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
              >
                {saving ? 'Creating…' : 'Create Operator'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
