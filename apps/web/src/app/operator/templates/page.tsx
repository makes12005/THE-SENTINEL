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

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl px-4 py-3 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#6C63FF]/50 transition-colors';

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

  const routes     = useQuery<Route[]>({ queryKey: ['routes'],          queryFn: () => get<Route[]>('/api/routes') });
  const buses      = useQuery<Bus[]>  ({ queryKey: ['agency-buses'],    queryFn: () => get<Bus[]>('/api/agency/buses') });
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
        className="w-full max-w-2xl rounded-2xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#42474e]/30 bg-[#1a1f24]">
          <div>
            <h2 className="text-xl font-black text-[#cee5ff] tracking-tight">
              {editing ? 'EDIT TEMPLATE' : 'CREATE NEW TEMPLATE'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-1">
              Configure Reusable Trip Parameters
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-[#0b0f12] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/30">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form body */}
        <div className="px-8 py-8 grid grid-cols-2 gap-x-6 gap-y-5 max-h-[70vh] overflow-y-auto bg-[#181c20]">
          {/* Name — full width */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Template Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning Express — Una to Ahmedabad"
              className={inputCls}
            />
          </div>

          {/* Route — full width */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Transit Route *</label>
            <select required value={form.route_id} onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))} className={inputCls}>
              <option value="">Select route…</option>
              {(routes.data ?? []).map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Preferred Conductor</label>
            <select value={form.conductor_id} onChange={e => setForm(f => ({ ...f, conductor_id: e.target.value }))} className={inputCls}>
              <option value="">No preference</option>
              {activeConductors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Driver */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Preferred Driver</label>
            <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} className={inputCls}>
              <option value="">No preference</option>
              {activeDrivers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Bus */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Vehicle Assignment</label>
            <select value={form.bus_id} onChange={e => setForm(f => ({ ...f, bus_id: e.target.value }))} className={inputCls}>
              <option value="">No preference</option>
              {activeBuses.map(b => <option key={b.id} value={b.id}>{b.number_plate}</option>)}
            </select>
          </div>

          {/* Empty spacer for alignment */}
          <div className="hidden md:block" />

          {/* Departure */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Default Departure</label>
            <input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} className={inputCls + ' [color-scheme:dark]'} />
          </div>

          {/* Arrival */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Default Arrival</label>
            <input type="time" value={form.arrival_time} onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))} className={inputCls + ' [color-scheme:dark]'} />
          </div>

          {/* Notes — full width */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c9198] ml-1">Internal Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional internal notes about this schedule…"
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-8 py-6 border-t border-[#42474e]/30 bg-[#1a1f24]">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[#0b0f12] border border-[#42474e]/40 h-14 text-[11px] font-black uppercase tracking-[0.2em] text-[#c2c7ce] hover:bg-[#1c2024] transition-all">
            Dismiss
          </button>
          <button type="submit" disabled={isPending} className="flex-[2] rounded-xl bg-[#6C63FF] h-14 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#5a53e0] transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(108,99,255,0.2)]">
            {isPending ? 'PROCESSING…' : editing ? 'UPDATE TEMPLATE' : 'SAVE TEMPLATE'}
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
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8]">
      {/* Ambient backgrounds */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6C63FF]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0B3C5D]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-10 h-24 border-b border-[#ffffff08] bg-[#101418]/80 backdrop-blur-2xl">
        <div>
          <h1 className="text-3xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            TRIP TEMPLATES
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198] mt-1 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#6C63FF] shadow-[0_0_10px_#6C63FF]" />
            AGENCY DEPLOYMENT BLUEPRINTS · {templates.length} SAVED
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#42474e] text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="FILTER TEMPLATES…"
              className="w-full bg-[#0b0f12] border border-[#42474e]/40 rounded-xl pl-12 pr-4 h-12 text-[#e0e3e8] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#6C63FF]/50 transition-all"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-3 rounded-xl bg-[#6C63FF] hover:bg-[#5a53e0] px-8 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(108,99,255,0.2)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            NEW TEMPLATE
          </button>
        </div>
      </header>

      <div className="px-10 py-10 max-w-[1600px] mx-auto relative z-10">
        
        {/* Templates Table Container */}
        <div className="bg-[#181c20] border border-[#42474e]/30 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0b0f12] border-b border-[#42474e]/40">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Template Name</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Route Details</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Bus / Vehicle</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Conductor</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Driver</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Timing (IST)</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-[#42474e]/10">
                    <td colSpan={7} className="px-6 py-8"><div className="h-4 bg-[#1c2024] rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-[#0b0f12] border border-[#42474e]/30 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-[40px] text-[#42474e]">content_copy</span>
                      </div>
                      <p className="text-xl font-black text-[#cee5ff] tracking-tight">No templates yet. Create your first template.</p>
                      <p className="text-xs text-[#8c9198] mt-2 mb-8 uppercase tracking-widest font-bold">Reusable trip configurations will appear here</p>
                      <button onClick={openCreate} className="px-8 py-3.5 rounded-xl bg-[#6C63FF] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#5a53e0] transition-all">
                        Initialize First Template
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((template) => (
                  <tr key={template.id} className="border-b border-[#42474e]/20 hover:bg-[#20252b] transition-colors group">
                    <td className="px-6 py-6">
                      <p className="text-sm font-black text-[#cee5ff] tracking-tight">{template.name}</p>
                      {template.notes && (
                        <p className="text-[10px] text-[#8c9198] mt-1 line-clamp-1 max-w-[200px]">{template.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#c2c7ce]">{template.from_city}</span>
                        <span className="material-symbols-outlined text-[14px] text-[#42474e]">arrow_forward</span>
                        <span className="text-xs font-bold text-[#c2c7ce]">{template.to_city}</span>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#6C63FF] mt-1">{template.route_name}</p>
                    </td>
                    <td className="px-6 py-6">
                      {template.bus_number_plate ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b0f12] border border-[#42474e]/40 w-fit">
                          <span className="material-symbols-outlined text-[14px] text-[#8c9198]">directions_bus</span>
                          <span className="text-xs font-mono font-bold text-[#cee5ff]">{template.bus_number_plate}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#42474e] font-black uppercase tracking-widest italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/10 flex items-center justify-center text-[#6C63FF]">
                          <span className="material-symbols-outlined text-[16px]">badge</span>
                        </div>
                        <span className="text-xs font-bold text-[#c2c7ce]">{template.conductor_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/20 flex items-center justify-center text-[#a3cbf2]">
                          <span className="material-symbols-outlined text-[16px]">steering_wheel</span>
                        </div>
                        <span className="text-xs font-bold text-[#c2c7ce]">{template.driver_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#cee5ff]">{template.departure_time?.slice(0, 5) ?? '—'}</span>
                        <span className="text-[#42474e] text-[10px]">→</span>
                        <span className="text-xs font-bold text-[#cee5ff]">{template.arrival_time?.slice(0, 5) ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/operator/trips/new?templateId=${template.id}`}
                          className="px-4 py-2 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF] text-[9px] font-black uppercase tracking-widest hover:bg-[#6C63FF] hover:text-white transition-all border border-[#6C63FF]/30"
                        >
                          Use
                        </Link>
                        <button
                          onClick={() => openEdit(template)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8c9198] hover:text-[#cee5ff] hover:bg-[#42474e]/30 transition-all border border-transparent hover:border-[#42474e]/40"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => { if (confirm(`Confirm deletion of template: ${template.name}?`)) deleteMut.mutate(template.id); }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8c9198] hover:text-[#FF7A00] hover:bg-[#FF7A00]/10 transition-all border border-transparent hover:border-[#FF7A00]/30"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend / Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0B3C5D]/10 border border-[#0B3C5D]/20">
            <span className="material-symbols-outlined text-[#a3cbf2]">auto_awesome</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#a3cbf2]">Deployment Optimization</p>
              <p className="text-xs text-[#8c9198] mt-1 leading-relaxed">
                Use templates to reduce dispatch time by over 90%. Templates automatically populate route, vehicle, and staff details.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20">
            <span className="material-symbols-outlined text-[#6C63FF]">sync</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6C63FF]">Real-time Availability</p>
              <p className="text-xs text-[#8c9198] mt-1 leading-relaxed">
                Templates only show active staff and vehicles. If a member is deactivated, the template will still work but staff fields will remain empty.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Modal */}
      {showModal && <TemplateModal editing={editing} onClose={closeModal} />}
    </div>
  );
}
