'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Route { id: string; name: string; from_city: string; to_city: string }
interface Bus   { id: string; number_plate: string; is_active: boolean }
interface Member { id: string; name: string; role: 'conductor' | 'driver'; is_active: boolean }

interface Template {
  id: string;
  name: string;
  route_id: string;
  route_name: string;
  from_city: string;
  to_city: string;
  bus_id: string | null;
  bus_number_plate: string | null;
  conductor_id: string | null;
  conductor_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface TemplateForm {
  name: string;
  route_id: string;
  conductor_id: string;
  driver_id: string;
  bus_id: string;
  departure_time: string;
  arrival_time: string;
  notes: string;
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  route_id: '',
  conductor_id: '',
  driver_id: '',
  bus_id: '',
  departure_time: '',
  arrival_time: '',
  notes: '',
};

// ─── Field ────────────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl px-4 py-3 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors';

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TemplateModal({
  editing,
  onClose,
}: {
  editing: Template | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TemplateForm>(
    editing
      ? {
          name: editing.name,
          route_id: editing.route_id,
          conductor_id: editing.conductor_id ?? '',
          driver_id: editing.driver_id ?? '',
          bus_id: editing.bus_id ?? '',
          departure_time: editing.departure_time ?? '',
          arrival_time: editing.arrival_time ?? '',
          notes: editing.notes ?? '',
        }
      : EMPTY_FORM
  );

  const routes    = useQuery<Route[]>({ queryKey: ['routes'],          queryFn: () => get<Route[]>('/api/routes') });
  const buses     = useQuery<Bus[]>  ({ queryKey: ['agency-buses'],    queryFn: () => get<Bus[]>('/api/agency/buses') });
  const conductors = useQuery<Member[]>({ queryKey: ['agency-members', 'conductor'], queryFn: () => get<Member[]>('/api/agency/members', { role: 'conductor' }) });
  const drivers    = useQuery<Member[]>({ queryKey: ['agency-members', 'driver'],    queryFn: () => get<Member[]>('/api/agency/members', { role: 'driver' }) });

  const activeBuses      = (buses.data ?? []).filter(b => b.is_active);
  const activeConductors = (conductors.data ?? []).filter(m => m.is_active);
  const activeDrivers    = (drivers.data ?? []).filter(m => m.is_active);

  const buildPayload = () => ({
    name: form.name,
    route_id: form.route_id,
    conductor_id: form.conductor_id || undefined,
    driver_id:    form.driver_id    || undefined,
    bus_id:       form.bus_id       || undefined,
    departure_time: form.departure_time || undefined,
    arrival_time:   form.arrival_time   || undefined,
    notes:          form.notes          || undefined,
  });

  const createMut = useMutation({
    mutationFn: () => post('/api/templates', buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created');
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create template'),
  });

  const updateMut = useMutation({
    mutationFn: () => put(`/api/templates/${editing!.id}`, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated');
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to update template'),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form
        onSubmit={e => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
        className="w-full max-w-2xl rounded-2xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#42474e]/30">
          <div>
            <h2 className="text-lg font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editing ? 'EDIT TEMPLATE' : 'CREATE TEMPLATE'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-1">
              Reusable Trip Configuration
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form body */}
        <div className="px-8 py-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {/* Name — full width */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Template Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning Express — Ahmedabad Surat"
              className={inputCls}
            />
          </div>

          {/* Route — full width */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Transit Route *</label>
            <select required value={form.route_id} onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))} className={inputCls}>
              <option value="">Select route…</option>
              {(routes.data ?? []).map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Conductor</label>
            <select value={form.conductor_id} onChange={e => setForm(f => ({ ...f, conductor_id: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {activeConductors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Driver */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Driver</label>
            <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {activeDrivers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Bus */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Vehicle</label>
            <select value={form.bus_id} onChange={e => setForm(f => ({ ...f, bus_id: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {activeBuses.map(b => <option key={b.id} value={b.id}>{b.number_plate}</option>)}
            </select>
          </div>

          {/* Departure */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Default Departure</label>
            <input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} className={inputCls + ' [color-scheme:dark]'} />
          </div>

          {/* Arrival */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Default Arrival</label>
            <input type="time" value={form.arrival_time} onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))} className={inputCls + ' [color-scheme:dark]'} />
          </div>

          {/* Notes — full width */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional internal notes…"
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-8 pb-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="flex-1 rounded-xl bg-[#a3cbf2] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] hover:bg-[#cee5ff] transition-colors disabled:opacity-50">
            {isPending ? 'Saving…' : editing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState<Template | null>(null);
  const [search, setSearch]           = useState('');

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => get<Template[]>('/api/templates'),
    refetchInterval: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del(`/api/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Template deleted'); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Cannot delete template'),
  });

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (t: Template) => { setEditing(t); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.route_name?.toLowerCase().includes(q) ||
      t.from_city?.toLowerCase().includes(q) ||
      t.to_city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[700px] h-[700px] bg-[#6C63FF]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-10 h-24 border-b border-[#ffffff08] bg-[#101418]/90 backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            TRIP TEMPLATES
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198] mt-1 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-pulse" />
            REUSABLE DEPLOYMENT CONFIGURATIONS · {templates.length} TEMPLATES
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-3 rounded-[0.75rem] bg-gradient-to-br from-[#cee5ff] to-[#a3cbf2] hover:from-white hover:to-[#cee5ff] px-8 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-[#003352] transition-all duration-300 shadow-[0_10px_40px_rgba(163,203,242,0.2)] hover:shadow-[0_15px_50px_rgba(163,203,242,0.4)] active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-500">add</span>
          NEW TEMPLATE
        </button>
      </header>

      <div className="px-10 pt-10 max-w-[1400px] mx-auto space-y-8 relative z-10">

        {/* Info banner */}
        <div className="flex items-start gap-4 bg-[#6C63FF]/10 border border-[#6C63FF]/30 rounded-xl px-6 py-4">
          <span className="material-symbols-outlined text-[#6C63FF] mt-0.5">info</span>
          <div>
            <p className="text-sm font-bold text-[#c2c7ce]">What are Templates?</p>
            <p className="text-xs text-[#8c9198] mt-0.5 leading-relaxed">
              Templates pre-configure route, vehicle, and staff assignments so operators can create recurring trips in one click.
              Templates are shared across your agency and can be used from the <Link href="/operator/trips/new" className="text-[#a3cbf2] hover:underline">Create Trip</Link> page.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9198] text-[20px]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH TEMPLATES…"
            className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl pl-12 pr-4 h-14 text-[#e0e3e8] text-xs font-bold tracking-widest focus:outline-none focus:border-[#a3cbf2]/50 transition-all placeholder:text-[#42474e]"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-[#181c20] border border-[#42474e]/20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#181c20] border border-[#42474e]/30 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[40px] text-[#42474e]">content_copy</span>
            </div>
            <p className="text-lg font-black text-[#c2c7ce]">{search ? 'No templates match your search' : 'No templates yet'}</p>
            <p className="text-sm text-[#8c9198] mt-2 mb-8">
              {search ? 'Try a different keyword' : 'Create your first reusable trip configuration'}
            </p>
            {!search && (
              <button onClick={openCreate} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#6C63FF] text-white text-sm font-bold hover:bg-[#5a53e0] transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create First Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(template => (
              <div key={template.id} className="group bg-[#181c20] border border-[#42474e]/20 rounded-2xl p-6 hover:border-[#6C63FF]/40 hover:shadow-[0_0_40px_rgba(108,99,255,0.08)] transition-all duration-300 flex flex-col gap-4">

                {/* Template header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-[#cee5ff] leading-tight truncate">{template.name}</p>
                    <p className="text-xs text-[#6C63FF] font-bold mt-0.5 truncate">
                      {template.route_name ?? '—'}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(template)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8c9198] hover:text-[#a3cbf2] hover:bg-[#a3cbf2]/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete template "${template.name}"?`)) deleteMut.mutate(template.id); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8c9198] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Route badge */}
                <div className="flex items-center gap-2 bg-[#0b0f12] border border-[#42474e]/30 rounded-xl px-4 py-2.5">
                  <span className="material-symbols-outlined text-[16px] text-[#6C63FF]">route</span>
                  <span className="text-xs font-bold text-[#c2c7ce]">{template.from_city}</span>
                  <span className="text-[#42474e] mx-1 text-[10px]">→</span>
                  <span className="text-xs font-bold text-[#c2c7ce]">{template.to_city}</span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#8c9198]">badge</span>
                    <span className="text-[#8c9198] truncate">{template.conductor_name ?? 'No conductor'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#8c9198]">steering_wheel</span>
                    <span className="text-[#8c9198] truncate">{template.driver_name ?? 'No driver'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#8c9198]">directions_bus</span>
                    <span className="text-[#8c9198] font-mono truncate">{template.bus_number_plate ?? 'No vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#8c9198]">schedule</span>
                    <span className="text-[#8c9198]">{template.departure_time ? template.departure_time.slice(0, 5) : '—'}</span>
                  </div>
                </div>

                {/* Notes */}
                {template.notes && (
                  <p className="text-[11px] text-[#8c9198] bg-[#0b0f12] rounded-lg px-3 py-2 border border-[#42474e]/20 line-clamp-2">
                    {template.notes}
                  </p>
                )}

                {/* Use template CTA */}
                <Link
                  href="/operator/trips/new"
                  className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#6C63FF]/30 text-[#6C63FF] text-[10px] font-black uppercase tracking-widest hover:bg-[#6C63FF]/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                  USE TEMPLATE
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <TemplateModal editing={editing} onClose={closeModal} />}
    </div>
  );
}
