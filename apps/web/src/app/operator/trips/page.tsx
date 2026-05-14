'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { StatusBadge, TableSkeleton } from '@/components/ui';
import { getSocket } from '@/lib/socket';
import { del, get, post, put } from '@/lib/api';
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
interface TripTemplate {
  id: string;
  name: string;
  route_id: string;
  conductor_id: string | null;
  driver_id: string | null;
  bus_id: string | null;
  departure_time: string | null;
}

function CreateTripModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'template' | 'scratch'>('scratch');
  const [form, setForm] = useState({ template_id: '', route_id: '', conductor_id: '', driver_id: '', bus_id: '', scheduled_date: '', assigned_operator_id: '' });

  const routes = useQuery<Route[]>({ queryKey: ['routes'], queryFn: () => get('/api/routes') });
  const conductorsQuery = useQuery<Member[]>({ queryKey: ['agency-members', 'conductor'], queryFn: () => get('/api/agency/members', { role: 'conductor' }) });
  const driversQuery = useQuery<Member[]>({ queryKey: ['agency-members', 'driver'], queryFn: () => get('/api/agency/members', { role: 'driver' }) });
  const operators = useQuery<Operator[]>({ queryKey: ['agency-operators'], queryFn: () => get('/api/agency/operators') });
  const buses = useQuery<Bus[]>({ queryKey: ['agency-buses'], queryFn: () => get('/api/agency/buses') });
  const summary = useQuery<{ trips_remaining: number }>({ queryKey: ['operator-summary'], queryFn: () => get('/api/operator/summary') });
  const templates = useQuery<TripTemplate[]>({ queryKey: ['templates'], queryFn: () => get('/api/templates') });

  const mutation = useMutation({
    mutationFn: () => post('/api/trips', {
      template_id: mode === 'template' ? form.template_id : undefined,
      route_id: form.route_id, conductor_id: form.conductor_id,
      driver_id: form.driver_id || undefined, bus_id: form.bus_id || undefined,
      scheduled_date: form.scheduled_date, assigned_operator_id: form.assigned_operator_id || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip created'); onClose(); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create trip'),
  });

  const conductors = (conductorsQuery.data ?? []).filter((m) => m.is_active);
  const drivers = (driversQuery.data ?? []).filter((m) => m.is_active);
  const tripsRemaining = summary.data?.trips_remaining ?? 0;
  const canCreateTrip = tripsRemaining > 0;
  const activeOperators = (operators.data ?? []).filter((o) => o.is_active);
  const activeBuses = (buses.data ?? []).filter((b) => b.is_active);

  const sel = 'w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-3 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors appearance-none';

  const templateSelected = (templates.data ?? []).find((t) => t.id === form.template_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="w-full max-w-xl rounded-xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl">
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#42474e]/30">
          <div>
            <h2 className="text-lg font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>INITIATE TRIP</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-1">New Deployment Configuration</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {!canCreateTrip && (
          <div className="mx-8 mt-6 rounded-lg border border-[#ffb4ab]/40 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
            No trips remaining. Contact your agency owner.
          </div>
        )}
        <div className="px-8 py-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex gap-2 rounded-lg border border-[#42474e]/40 p-1 bg-[#0b0f12]">
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider ${mode === 'template' ? 'bg-[#a3cbf2] text-[#003352]' : 'text-[#8c9198]'}`}
            >
              Create from Template
            </button>
            <button
              type="button"
              onClick={() => setMode('scratch')}
              className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider ${mode === 'scratch' ? 'bg-[#a3cbf2] text-[#003352]' : 'text-[#8c9198]'}`}
            >
              Create from Scratch
            </button>
          </div>

          {mode === 'template' && (
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Template</label>
              <select
                required
                value={form.template_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const t = (templates.data ?? []).find((x) => x.id === id);
                  setForm((c) => ({
                    ...c,
                    template_id: id,
                    route_id: t?.route_id ?? c.route_id,
                    conductor_id: t?.conductor_id ?? c.conductor_id,
                    driver_id: t?.driver_id ?? c.driver_id,
                    bus_id: t?.bus_id ?? c.bus_id,
                  }));
                }}
                className={sel}
              >
                <option value="">Select template</option>
                {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Route</label>
            <select required value={form.route_id} onChange={(e) => setForm((c) => ({ ...c, route_id: e.target.value }))} className={sel}>
              <option value="">Select route</option>
              {(routes.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Date</label>
            <input required type="date" value={form.scheduled_date} onChange={(e) => setForm((c) => ({ ...c, scheduled_date: e.target.value }))} className={sel} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Conductor</label>
            <select required value={form.conductor_id} onChange={(e) => setForm((c) => ({ ...c, conductor_id: e.target.value }))} className={sel}>
              <option value="">Select conductor</option>
              {conductors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Driver <span className="text-[#8c9198]/60">(optional)</span></label>
            <select value={form.driver_id} onChange={(e) => setForm((c) => ({ ...c, driver_id: e.target.value }))} className={sel}>
              <option value="">Select driver</option>
              {drivers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Bus <span className="text-[#8c9198]/60">(optional)</span></label>
            <select value={form.bus_id} onChange={(e) => setForm((c) => ({ ...c, bus_id: e.target.value }))} className={sel}>
              <option value="">Select bus</option>
              {activeBuses.map((b) => <option key={b.id} value={b.id}>{b.number_plate}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Assign To Operator</label>
            <select value={form.assigned_operator_id} onChange={(e) => setForm((c) => ({ ...c, assigned_operator_id: e.target.value }))} className={sel}>
              <option value="">{user?.name ? `Myself (${user.name})` : 'Myself'}</option>
              {activeOperators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          {mode === 'template' && templateSelected && (
            <div className="md:col-span-2 text-xs text-[#8c9198] bg-[#1c2024] border border-[#42474e]/40 rounded-lg px-4 py-3">
              Template defaults loaded. You can override route, staff, or bus before submit.
            </div>
          )}
        </div>
        <div className="flex gap-3 px-8 pb-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors">Cancel</button>
          <button type="submit" disabled={mutation.isPending || !canCreateTrip} className="flex-1 rounded-lg bg-[#a3cbf2] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] hover:bg-[#cee5ff] transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Deploy Trip'}
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip reassigned'); onClose(); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to reassign trip'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="w-full max-w-md rounded-xl border border-[#42474e]/40 bg-[#181c20] p-8 shadow-2xl">
        <h2 className="mb-1 text-lg font-black text-[#cee5ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>REASSIGN TRIP</h2>
        <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Current: {trip.assigned_operator_name || 'Unassigned'}</p>
        <select required value={assignedOperatorId} onChange={(e) => setAssignedOperatorId(e.target.value)}
          className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-3 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors">
          <option value="">Select operator</option>
          {(operators.data ?? []).filter((o) => o.is_active).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-lg bg-[#a3cbf2] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#003352] hover:bg-[#cee5ff] transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}

type TabType = 'hub' | 'active' | 'upcoming' | 'completed' | 'expired';

export default function TripsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('hub');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const queryClient = useQueryClient();

  const trips = useQuery<Trip[]>({ queryKey: ['trips'], queryFn: () => get('/api/trips'), refetchInterval: 30000 });

  const deleteTrip = useMutation({
    mutationFn: (id: string) => del(`/api/trips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip deleted');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Cannot delete this trip'),
  });

  const allTrips = (trips.data ?? []).filter((trip) => {
    if (statusFilter && trip.status !== statusFilter) return false;
    if (dateFilter && trip.scheduled_date !== dateFilter) return false;
    if (routeSearch) {
      const q = routeSearch.toLowerCase();
      const routeName = `${trip.route?.name ?? ''} ${trip.route?.from_city ?? ''} ${trip.route?.to_city ?? ''}`.toLowerCase();
      if (!routeName.includes(q)) return false;
    }
    return true;
  });
  const activeTrips    = allTrips.filter((t) => ['active', 'in_progress', 'started'].includes(t.status));
  const upcomingTrips  = allTrips.filter((t) => ['scheduled', 'pending', 'confirmed'].includes(t.status));
  const completedTrips = allTrips.filter((t) => ['completed', 'done', 'finished'].includes(t.status));
  const expiredTrips   = allTrips.filter((t) => t.status === 'expired');
  const pendingUploads = allTrips.filter((t) => t.passenger_count === 0 && t.status !== 'completed');

  const TripTable = ({ data }: { data: Trip[] }) => (
    <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#42474e]/50 bg-[#1c2024]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
              <th className="px-6 py-5 font-normal">Vehicle</th>
              <th className="px-6 py-5 font-normal">Route</th>
              <th className="px-6 py-5 font-normal">Schedule</th>
              <th className="px-6 py-5 font-normal">Staff</th>
              <th className="px-6 py-5 font-normal">Pax</th>
              <th className="px-6 py-5 font-normal">Status</th>
              <th className="px-6 py-5 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#42474e]/20">
            {data.map((trip) => (
              <tr key={trip.id} className="hover:bg-[#1c2024] transition-colors group">
                <td className="px-6 py-5 font-mono text-sm font-bold text-[#a3cbf2]">{trip.bus_number || '—'}</td>
                <td className="px-6 py-5 text-sm text-[#e0e3e8]">
                  <span className="font-bold">{trip.route.from_city}</span>
                  <span className="text-[#8c9198] mx-2 text-[10px] uppercase font-black">to</span>
                  <span className="font-bold">{trip.route.to_city}</span>
                </td>
                <td className="px-6 py-5 font-mono text-xs text-[#c2c7ce]">{trip.scheduled_date}</td>
                <td className="px-6 py-5 text-sm text-[#c2c7ce]">{trip.conductor.name}</td>
                <td className="px-6 py-5 text-sm text-[#c2c7ce]">{trip.passenger_count ?? 0}</td>
                <td className="px-6 py-5"><StatusBadge status={trip.status} /></td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {/* Reassign: owner only */}
                    {user?.role === 'owner' && (
                      <button onClick={() => setSelectedTrip(trip)} className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb68b] hover:text-[#ffdcca] transition-colors">Reassign</button>
                    )}
                    {/* Delete: own trips or owner, only for scheduled/expired */}
                    {(user?.id === trip.owned_by_operator_id || user?.role === 'owner') && ['scheduled', 'expired'].includes(trip.status) && (
                      <button
                        onClick={() => { if (confirm('Delete this trip? This cannot be undone.')) deleteTrip.mutate(trip.id); }}
                        disabled={deleteTrip.isPending}
                        className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb4ab] hover:text-[#ff897d] transition-colors disabled:opacity-40"
                      >
                        Delete
                      </button>
                    )}
                    <Link href={`/operator/trips/${trip.id}`} className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a3cbf2] hover:text-[#cee5ff] flex items-center gap-1.5 transition-colors">
                      MISSION DATA <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-20 text-center text-[#8c9198] text-sm font-medium tracking-wide">No mission records found in this vector.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12 overflow-hidden">
      {/* Ambient background */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-[#a3cbf2]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#ffb68b]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-10 h-24 border-b border-[#ffffff08] bg-[#101418]/90 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#a3cbf2]/5 to-transparent pointer-events-none"></div>
        <div className="relative">
          <h1 className="text-3xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>COMMAND CENTER</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c9198] mt-1 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3cbf2] animate-pulse"></span>
            TRIP DEPLOYMENTS · {allTrips.length} VECTOR RECORDS
          </p>
        </div>
        <Link href="/operator/trips/new"
          className="flex items-center gap-3 rounded-[0.75rem] bg-gradient-to-br from-[#cee5ff] to-[#a3cbf2] hover:from-white hover:to-[#cee5ff] px-8 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-[#003352] transition-all duration-300 shadow-[0_10px_40px_rgba(163,203,242,0.2)] hover:shadow-[0_15px_50px_rgba(163,203,242,0.4)] active:scale-95 group">
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-500">add</span>
          INITIALIZE TRIP
        </Link>
      </header>

      <div className="px-10 pt-10 max-w-[1400px] mx-auto space-y-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9198] text-[20px] group-focus-within:text-[#a3cbf2] transition-colors">search</span>
            <input value={routeSearch} onChange={(e) => setRouteSearch(e.target.value)} placeholder="SEARCH ROUTE VECTOR..." className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl pl-12 pr-4 h-14 text-[#e0e3e8] text-xs font-bold tracking-widest focus:outline-none focus:border-[#a3cbf2]/50 transition-all placeholder:text-[#42474e]" />
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9198] text-[20px]">filter_list</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl pl-12 pr-10 h-14 text-[#e0e3e8] text-xs font-bold tracking-widest focus:outline-none focus:border-[#a3cbf2]/50 transition-all appearance-none cursor-pointer">
              <option value="">ALL MISSION STATES</option>
              <option value="scheduled">SCHEDULED</option>
              <option value="active">ACTIVE</option>
              <option value="completed">COMPLETED</option>
              <option value="expired">EXPIRED</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">expand_more</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c9198] text-[20px]">calendar_today</span>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl pl-12 pr-4 h-14 text-[#e0e3e8] text-xs font-bold tracking-widest focus:outline-none focus:border-[#a3cbf2]/50 transition-all [color-scheme:dark]" />
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-1 border-b border-[#42474e]/30">
          {([
          { key: 'hub',       label: 'TACTICAL OVERVIEW',                     icon: 'grid_view'      },
            { key: 'active',   label: `ACTIVE MISSIONS (${activeTrips.length})`,   icon: 'explore'        },
            { key: 'upcoming', label: `UPCOMING (${upcomingTrips.length})`,          icon: 'calendar_month' },
            { key: 'completed',label: `LOGGED (${completedTrips.length})`,           icon: 'check_circle'   },
            { key: 'expired',  label: `EXPIRED (${expiredTrips.length})`,            icon: 'timer_off'      },
          ] as { key: TabType; label: string; icon: string }[]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] border-b-2 transition-all duration-500 relative group ${activeTab === tab.key
                ? 'text-[#a3cbf2] border-[#a3cbf2]'
                : 'text-[#8c9198] border-transparent hover:text-[#c2c7ce] hover:border-[#42474e]'}`}>
              {activeTab === tab.key && <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#a3cbf2] blur-[4px]"></div>}
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-500 ${activeTab === tab.key ? 'scale-110' : 'group-hover:scale-110'}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hub view — bento cards linking to sub-pages */}
        {activeTab === 'hub' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
            {/* Pending uploads */}
            <Link href="/operator/trips/pending"
              className="group relative bg-[#181c20]/80 rounded-[2rem] p-10 border border-[#42474e]/30 hover:border-[#ffb68b]/50 hover:bg-[#1c2024] transition-all duration-500 text-left overflow-hidden h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#ffb68b]/5 blur-[60px] rounded-full group-hover:bg-[#ffb68b]/15 transition-all duration-700" />
              <div className="flex justify-between items-start relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#0b0f12] border border-[#42474e]/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[#ffb68b] text-[32px]">inventory</span>
                </div>
                {pendingUploads.length > 0 && (
                  <div className="flex items-center gap-3 bg-[#ffb68b]/10 px-5 py-2.5 rounded-full border border-[#ffb68b]/30 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-[#ffb68b] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffb68b]">CRITICAL ACTION</span>
                  </div>
                )}
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-[#e0e3e8] mb-2 group-hover:text-[#ffdcca] transition-colors tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>MANIFEST SYNC</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-[#ffb68b]">{pendingUploads.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">AWAITING PASSENGER DATA</span>
                </div>
              </div>
            </Link>

            {/* Active now */}
            <Link href="/operator/trips/active"
              className="group relative bg-[#181c20]/80 rounded-[2rem] p-10 border border-[#42474e]/30 hover:border-[#a3cbf2]/50 hover:bg-[#1c2024] transition-all duration-500 text-left overflow-hidden h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#a3cbf2]/5 blur-[60px] rounded-full group-hover:bg-[#a3cbf2]/15 transition-all duration-700" />
              <div className="flex justify-between items-start relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#0b0f12] border border-[#42474e]/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[#a3cbf2] text-[32px]">radar</span>
                </div>
                <div className="flex items-center gap-3 bg-[#a3cbf2]/10 px-5 py-2.5 rounded-full border border-[#a3cbf2]/30 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-[#a3cbf2] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a3cbf2]">LIVE OPS</span>
                </div>
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-[#e0e3e8] mb-2 group-hover:text-[#cee5ff] transition-colors tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>LIVE DEPLOYMENTS</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-[#a3cbf2]">{activeTrips.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">ACTIVE MISSION VECTORS</span>
                </div>
              </div>
            </Link>

            {/* Upcoming */}
            <Link href="/operator/trips/upcoming"
              className="group relative bg-[#181c20]/80 rounded-[2rem] p-10 border border-[#42474e]/30 hover:border-white/30 hover:bg-[#1c2024] transition-all duration-500 text-left overflow-hidden h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#c4c0ff]/3 blur-[60px] rounded-full group-hover:bg-[#c4c0ff]/10 transition-all duration-700" />
              <div className="w-16 h-16 rounded-2xl bg-[#0b0f12] border border-[#42474e]/50 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-[#c2c7ce] text-[32px]">event_repeat</span>
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-[#e0e3e8] mb-2 group-hover:text-white transition-colors tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>SCHEDULED</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-[#c2c7ce]">{upcomingTrips.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">UPCOMING OPERATIONS</span>
                </div>
              </div>
            </Link>

            {/* Completed */}
            <Link href="/operator/trips/completed"
              className="group relative bg-[#181c20]/80 rounded-[2rem] p-10 border border-[#42474e]/30 hover:border-white/30 hover:bg-[#1c2024] transition-all duration-500 text-left overflow-hidden h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md opacity-80 hover:opacity-100">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#31353a]/20 blur-[60px] rounded-full group-hover:bg-[#31353a]/40 transition-all duration-700" />
              <div className="w-16 h-16 rounded-2xl bg-[#0b0f12] border border-[#42474e]/50 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-[#8c9198] text-[32px]">history_edu</span>
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-[#e0e3e8] mb-2 group-hover:text-white transition-colors tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>ARCHIVE</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-[#8c9198]">{completedTrips.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">COMPLETED MISSIONS</span>
                </div>
              </div>
            </Link>

            {/* Expired */}
            <button onClick={() => setActiveTab('expired')}
              className="group relative bg-[#181c20]/80 rounded-[2rem] p-10 border border-[#42474e]/30 hover:border-[#FF7A00]/40 hover:bg-[#1c2024] transition-all duration-500 text-left overflow-hidden h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md opacity-80 hover:opacity-100 w-full">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF7A00]/5 blur-[60px] rounded-full group-hover:bg-[#FF7A00]/10 transition-all duration-700" />
              <div className="flex justify-between items-start relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#0b0f12] border border-[#42474e]/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[#FF7A00] text-[32px]">timer_off</span>
                </div>
                {expiredTrips.length > 0 && (
                  <div className="flex items-center gap-2 bg-[#FF7A00]/10 px-4 py-2 rounded-full border border-[#FF7A00]/30">
                    <div className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7A00]">NEEDS ACTION</span>
                  </div>
                )}
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-[#e0e3e8] mb-2 group-hover:text-[#FF7A00] transition-colors tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>EXPIRED</h2>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-black text-[#FF7A00]">{expiredTrips.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">TRIPS NOT STARTED</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* List views */}
        {activeTab !== 'hub' && (
          trips.isLoading ? <div className="bg-[#181c20] rounded-2xl border border-[#42474e]/20 p-10 shadow-2xl"><TableSkeleton rows={8} /></div>
            : activeTab === 'active'    ? <TripTable data={activeTrips} />
            : activeTab === 'upcoming'  ? <TripTable data={upcomingTrips} />
            : activeTab === 'expired'   ? <TripTable data={expiredTrips} />
            : <TripTable data={completedTrips} />
        )}
      </div>

      {selectedTrip && <ReassignTripModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
    </div>
  );
}
