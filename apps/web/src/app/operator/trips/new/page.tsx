'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

interface Route {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
}

interface Bus {
  id: string;
  number_plate: string;
  model: string | null;
  is_active: boolean;
}

interface Member {
  id: string;
  name: string;
  role: 'conductor' | 'driver';
  is_active: boolean;
}

interface Operator {
  id: string;
  name: string;
  is_active: boolean;
}

interface Template {
  id: string;
  name: string;
  route_id: string;
  bus_id: string | null;
  conductor_id: string | null;
  driver_id: string | null;
  departure_time: string | null;
}

interface Stop {
  id: string;
  name: string;
  sequence_number: number;
}

interface ManifestPassenger {
  passenger_name: string;
  passenger_phone: string;
  stop_id: string;
}

export default function CreateTripPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => {
    // Read ?templateId from URL (set by templates page "Use" button)
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    return {
      route_id: '',
      conductor_id: '',
      driver_id: '',
      bus_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '08:00',
      assigned_operator_id: '',
      template_id: params.get('templateId') ?? '',
    };
  });

  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [newPassenger, setNewPassenger] = useState<ManifestPassenger>({
    passenger_name: '',
    passenger_phone: '+91',
    stop_id: '',
  });

  // Data Fetching — get() already returns response.data (unwrapped)
  const routes = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: () => get<Route[]>('/api/routes'),
  });

  const buses = useQuery<Bus[]>({
    queryKey: ['agency-buses'],
    queryFn: () => get<Bus[]>('/api/agency/buses'),
  });

  const members = useQuery<Member[]>({
    queryKey: ['agency-members'],
    queryFn: () => get<Member[]>('/api/agency/members'),
  });

  const operators = useQuery<Operator[]>({
    queryKey: ['agency-operators'],
    queryFn: () => get<Operator[]>('/api/agency/operators'),
  });

  const routeStops = useQuery<Stop[]>({
    queryKey: ['route-stops', form.route_id],
    queryFn: () => form.route_id ? get<Stop[]>(`/api/routes/${form.route_id}/stops`) : Promise.resolve([]),
    enabled: !!form.route_id,
  });

  const summary = useQuery<{ trips_remaining: number }>({
    queryKey: ['operator-summary'],
    queryFn: () => get<{ trips_remaining: number }>('/api/operator/summary'),
  });

  const templates = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => get<Template[]>('/api/templates'),
  });

  // Auto-populate form fields when a template is selected
  useEffect(() => {
    if (!form.template_id || !templates.data) return;
    const tpl = templates.data.find(t => t.id === form.template_id);
    if (!tpl) return;
    setForm(f => ({
      ...f,
      route_id:     tpl.route_id      || f.route_id,
      conductor_id: tpl.conductor_id  || f.conductor_id,
      driver_id:    tpl.driver_id     || f.driver_id,
      bus_id:       tpl.bus_id        || f.bus_id,
      scheduled_time: tpl.departure_time ? tpl.departure_time.slice(0, 5) : f.scheduled_time,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.template_id, templates.data]);

  const conductors = (members.data ?? []).filter(m => m.role === 'conductor' && m.is_active);
  const drivers = (members.data ?? []).filter(m => m.role === 'driver' && m.is_active);
  const activeOperators = (operators.data ?? []).filter(o => o.is_active);
  const activeBuses = (buses.data ?? []).filter(b => b.is_active);
  const tripsRemaining = summary.data?.trips_remaining ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tripsRemaining <= 0) {
      toast.error('No trips remaining in your wallet.');
      return;
    }
    if (!form.route_id || !form.conductor_id || !form.scheduled_date) {
      toast.error('Route, Conductor, and Date are required');
      return;
    }
    setSaving(true);

    try {
      const payload = {
        ...form,
        driver_id: form.driver_id || undefined,
        bus_id: form.bus_id || undefined,
        assigned_operator_id: form.assigned_operator_id || undefined,
      };

      const tripRes: any = await post('/api/trips', payload);
      const tripId = tripRes.id;

      // 1. Upload file if exists
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const token = localStorage.getItem('access_token') || (() => {
          try { return JSON.parse(localStorage.getItem('busalert-auth') ?? '{}').state?.token ?? ''; } catch { return ''; }
        })();
        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/trips/${tripId}/passengers/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok || !uploadResult.success) {
          throw new Error(uploadResult.error?.message ?? 'Manifest upload failed');
        }
      }

      // 2. Add manual manifest if exists
      if (manifest.length > 0) {
        await post(`/api/trips/${tripId}/passengers/batch`, { passengers: manifest });
      }

      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['operator-summary'] });
      toast.success('Trip and Manifest created successfully');
      router.push('/operator/trips');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPassenger = () => {
    if (!newPassenger.passenger_name || newPassenger.passenger_phone.length < 10 || !newPassenger.stop_id) {
      toast.error('Please fill all passenger details correctly');
      return;
    }
    setManifest([...manifest, newPassenger]);
    setNewPassenger({
      passenger_name: '',
      passenger_phone: '+91',
      stop_id: '',
    });
    setShowAddPassenger(false);
  };

  const removePassenger = (index: number) => {
    setManifest(manifest.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedRoute = routes.data?.find(r => r.id === form.route_id);
  const selectedConductor = members.data?.find(s => s.id === form.conductor_id);
  const selectedBus = buses.data?.find(b => b.id === form.bus_id);

  return (
    <div className="min-h-screen bg-[#101418] text-[#e0e3e8] font-sans flex flex-col">
      {/* Ambient background */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#ffb68b]/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 md:py-12 relative z-10">
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/operator/trips" className="flex items-center gap-2 text-[0.625rem] font-bold uppercase tracking-widest text-[#a3cbf2] hover:text-[#cee5ff] transition-colors mb-4 inline-flex">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              BACK TO MISSIONS
            </Link>
            <h1 className="text-3xl font-black text-[#cee5ff] mb-1 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Initialize Mission
            </h1>
            <p className="text-sm text-[#8c9198]">
              Configure trip deployment and passenger manifest synchronization.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-[#181c20] px-4 py-3 rounded-xl flex items-center gap-3 border border-[#42474e]/30 shadow-lg">
              <span className="material-symbols-outlined text-[#ffb68b]">account_balance_wallet</span>
              <div>
                <p className="text-[10px] uppercase text-[#8c9198] tracking-wider font-bold">Credits Remaining</p>
                <p className={`text-sm font-black ${tripsRemaining > 0 ? 'text-[#cee5ff]' : 'text-[#ffb4ab]'}`}>
                  {tripsRemaining} TRIPS
                </p>
              </div>
            </div>
            <div className="bg-[#181c20] px-4 py-3 rounded-xl flex items-center gap-3 border border-[#42474e]/30 shadow-lg">
              <span className="material-symbols-outlined text-[#a3cbf2]">schedule</span>
              <div>
                <p className="text-[10px] uppercase text-[#8c9198] tracking-wider font-bold">System Time</p>
                <p className="text-sm font-black text-[#cee5ff]">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Area */}
          <form id="create-trip-form" onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
            {/* Section 1: Template Selection */}
            <section className="bg-[#181c20] border border-[#42474e]/20 p-8 rounded-2xl relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#a3cbf2]/40 group-hover:bg-[#a3cbf2] transition-all duration-500"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#1c2024] border border-[#42474e]/50 flex items-center justify-center text-[#a3cbf2] shadow-inner">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Template Engine</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Automated Configuration</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-2">SELECT ROUTE TEMPLATE</label>
                  <div className="relative">
                    <select
                      value={form.template_id}
                      onChange={(e) => setForm(f => ({ ...f, template_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-xl px-6 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#a3cbf2]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">None — Manual Entry</option>
                      {(templates.data ?? []).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-[#0b0f12] p-4 rounded-xl border border-[#42474e]/30">
                  <span className="material-symbols-outlined text-[#8c9198] text-[20px] mt-0.5">info</span>
                  <p className="text-xs text-[#8c9198] leading-relaxed">
                    Templates automatically configure route geometry, standard stops, and assigned hardware for recurring deployments.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Deployment Details */}
            <section className="bg-[#181c20] border border-[#42474e]/20 p-8 rounded-2xl relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#6C63FF]/40 group-hover:bg-[#6C63FF] transition-all duration-500"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#1c2024] border border-[#42474e]/50 flex items-center justify-center text-[#6C63FF] shadow-inner">
                  <span className="material-symbols-outlined">rocket_launch</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Mission Parameters</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Core Operational Data</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    TRANSIT ROUTE <span className="text-[#ffb68b]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.route_id}
                      onChange={(e) => setForm(f => ({ ...f, route_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">Select Route...</option>
                      {routes.data?.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">route</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    DEPLOYMENT DATE <span className="text-[#ffb68b]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="date"
                      value={form.scheduled_date}
                      onChange={(e) => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className="w-full h-14 bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 text-[#e0e3e8] text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]/30 [color-scheme:dark] shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    DEPARTURE TIME
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={form.scheduled_time}
                      onChange={(e) => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                      className="w-full h-14 bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 text-[#e0e3e8] text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]/30 [color-scheme:dark] shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    CONDUCTOR <span className="text-[#ffb68b]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.conductor_id}
                      onChange={(e) => setForm(f => ({ ...f, conductor_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">Select Conductor...</option>
                      {conductors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">badge</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    DRIVER (OPTIONAL)
                  </label>
                  <div className="relative">
                    <select
                      value={form.driver_id}
                      onChange={(e) => setForm(f => ({ ...f, driver_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">Select Driver...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">steering_wheel</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    ASSIGNED VEHICLE
                  </label>
                  <div className="relative">
                    <select
                      value={form.bus_id}
                      onChange={(e) => setForm(f => ({ ...f, bus_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">Select Bus...</option>
                      {activeBuses.map(b => (
                        <option key={b.id} value={b.id}>{b.number_plate}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">directions_bus</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">
                    SECONDARY OPERATOR
                  </label>
                  <div className="relative">
                    <select
                      value={form.assigned_operator_id}
                      onChange={(e) => setForm(f => ({ ...f, assigned_operator_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#42474e]/60 rounded-full px-8 py-4 text-[#e0e3e8] appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="">{currentUser?.name ? `Myself (${currentUser.name})` : 'Myself'}</option>
                      {activeOperators.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">engineering</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Passenger Manifest */}
            <section className="bg-[#181c20] border border-[#42474e]/20 p-8 rounded-2xl relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffb68b]/40 group-hover:bg-[#ffb68b] transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1c2024] border border-[#42474e]/50 flex items-center justify-center text-[#ffb68b] shadow-inner">
                    <span className="material-symbols-outlined">group_add</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Passenger Manifest</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">Synchronization Hub</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#ffb68b]/10 px-4 py-2 rounded-full border border-[#ffb68b]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffb68b] animate-pulse"></span>
                  <span className="text-[10px] font-black text-[#ffb68b] uppercase tracking-widest">
                    {manifest.length} Records
                  </span>
                </div>
              </div>

              {manifest.length > 0 && (
                <div className="mb-8 overflow-hidden border border-[#42474e]/20 rounded-2xl bg-[#0b0f12]/50">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1c2024]/80">
                      <tr className="text-[10px] font-bold text-[#8c9198] uppercase tracking-[0.15em]">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Stop</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#42474e]/20">
                      {manifest.map((p, idx) => {
                        const stop = routeStops.data?.find(s => s.id === p.stop_id);
                        return (
                          <tr key={idx} className="hover:bg-[#1c2024]/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-bold text-[#e0e3e8]">{p.passenger_name}</td>
                            <td className="px-6 py-4 text-sm text-[#8c9198] font-mono">{p.passenger_phone}</td>
                            <td className="px-6 py-4 text-sm text-[#cee5ff]">{stop?.name || '...'}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removePassenger(idx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-all"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {showAddPassenger ? (
                <div className="bg-[#0b0f12] border border-[#42474e]/40 p-8 rounded-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">FULL NAME</label>
                      <input
                        type="text"
                        value={newPassenger.passenger_name}
                        onChange={(e) => setNewPassenger({ ...newPassenger, passenger_name: e.target.value })}
                        placeholder="e.g. Mahek Patel"
                        className="w-full h-14 bg-[#181c20] border border-[#42474e]/60 rounded-full px-8 text-sm text-[#e0e3e8] outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">PHONE NUMBER</label>
                      <input
                        type="text"
                        value={newPassenger.passenger_phone}
                        onChange={(e) => setNewPassenger({ ...newPassenger, passenger_phone: e.target.value })}
                        placeholder="+91XXXXXXXXXX"
                        className="w-full h-14 bg-[#181c20] border border-[#42474e]/60 rounded-full px-8 text-sm text-[#e0e3e8] outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] block mb-3 ml-4">PICKUP STOP</label>
                      <div className="relative">
                        <select
                          value={newPassenger.stop_id}
                          onChange={(e) => setNewPassenger({ ...newPassenger, stop_id: e.target.value })}
                          className="w-full h-14 bg-[#181c20] border border-[#42474e]/60 rounded-full px-8 text-sm text-[#e0e3e8] outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Select Stop...</option>
                          {routeStops.data?.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (Stop #{s.sequence_number})</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none">location_on</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddPassenger(false)}
                      className="px-8 h-14 rounded-full border border-[#42474e]/50 hover:bg-[#1c2024] text-[10px] font-bold text-[#8c9198] hover:text-[#e0e3e8] transition-all uppercase tracking-widest"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPassenger}
                      className="px-10 h-14 bg-gradient-to-r from-[#cee5ff] to-[#a3cbf2] text-[#003352] rounded-full font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_25px_rgba(163,203,242,0.3)] transition-all active:scale-95 shadow-lg"
                    >
                      Commit Entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 group ${uploadedFile ? 'border-[#a3cbf2] bg-[#a3cbf2]/5 shadow-inner' : 'border-[#42474e]/40 hover:border-[#ffb68b]/50 hover:bg-[#1c2024]'}`}
                  >
                    {uploadedFile ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-[#a3cbf2]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-[#a3cbf2]">inventory_2</span>
                        </div>
                        <div className="text-center">
                          <span className="block font-bold text-[#e0e3e8] text-sm truncate max-w-[200px] mb-1">{uploadedFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="text-[10px] text-[#ffb4ab] uppercase font-bold hover:text-[#ffdad6] transition-colors"
                          >
                            Remove Payload
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-4xl text-[#8c9198] group-hover:text-[#ffb68b] transition-colors duration-500">cloud_upload</span>
                        <div className="text-center">
                          <span className="block font-bold text-[#e0e3e8] text-sm mb-0.5">Upload Manifest</span>
                          <span className="block text-[10px] text-[#8c9198] uppercase tracking-widest">CSV / EXCEL / XLSX</span>
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.route_id) {
                        toast.error('Identify transit route first');
                        return;
                      }
                      setShowAddPassenger(true);
                    }}
                    className="h-36 border-2 border-dashed border-[#42474e]/40 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#ffb68b]/50 hover:bg-[#1c2024] transition-all duration-300 group"
                  >
                    <span className="material-symbols-outlined text-4xl text-[#8c9198] group-hover:text-[#ffb68b] transition-colors duration-500">add_moderator</span>
                    <div className="text-center">
                      <span className="block font-bold text-[#e0e3e8] text-sm mb-0.5">Manual Injection</span>
                      <span className="block text-[10px] text-[#8c9198] uppercase tracking-widest">Single Record Entry</span>
                    </div>
                  </button>
                </div>
              )}
            </section>
          </form>

          {/* Sidebar Command Center */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="bg-[#181c20]/90 border border-[#42474e]/40 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#a3cbf2]/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-[#a3cbf2]/10 transition-all duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ffb68b]/3 rounded-full -ml-16 -mb-16 blur-2xl group-hover:bg-[#ffb68b]/8 transition-all duration-1000"></div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-[#cee5ff] mb-10 border-b border-[#42474e]/30 pb-8 flex items-center justify-between tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Command Overview
                    <span className="material-symbols-outlined text-[#a3cbf2] animate-pulse">monitoring</span>
                  </h3>

                  <div className="space-y-10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198]">Status</span>
                      <span className="bg-[#0b0f12] text-[#ffb68b] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-[#ffb68b]/20 shadow-lg">
                        PRE-DEPLOYMENT
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c9198] block mb-3">Target Route</span>
                      <div className="bg-[#0b0f12]/50 p-5 rounded-2xl border border-[#42474e]/30 group-hover:border-[#a3cbf2]/30 transition-colors">
                        <p className="text-xl text-[#cee5ff] font-black tracking-tight leading-tight">
                          {selectedRoute ? selectedRoute.name : 'Awaiting Route...'}
                        </p>
                        {selectedRoute && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="material-symbols-outlined text-[14px] text-[#a3cbf2]">location_on</span>
                            <p className="text-[10px] text-[#8c9198] font-bold uppercase tracking-widest">
                              {selectedRoute.from_city} <span className="text-[#a3cbf2] mx-1">→</span> {selectedRoute.to_city}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0b0f12] p-5 rounded-2xl border border-[#42474e]/40 shadow-inner">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c9198] block mb-2">Schedule</span>
                        <p className="text-xs font-black text-[#e0e3e8] font-mono tracking-wider">{form.scheduled_date || '--/--/----'}</p>
                      </div>
                      <div className="bg-[#0b0f12] p-5 rounded-2xl border border-[#42474e]/40 shadow-inner">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c9198] block mb-2">Time (IST)</span>
                        <p className="text-xs font-black text-[#e0e3e8] font-mono tracking-wider">{form.scheduled_time || '--:--'}</p>
                      </div>
                    </div>

                    <div className="bg-[#0b0f12]/80 rounded-2xl p-6 space-y-5 border border-[#42474e]/50 shadow-xl">
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-3 text-[9px] text-[#8c9198] uppercase tracking-[0.2em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#a3cbf2] group-hover/item:scale-110 transition-transform">shuttle</span> Vehicle
                        </span>
                        <span className="text-xs text-[#e0e3e8] font-black">{selectedBus?.number_plate || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-3 text-[9px] text-[#8c9198] uppercase tracking-[0.2em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#a3cbf2] group-hover/item:scale-110 transition-transform">verified_user</span> Staff
                        </span>
                        <span className="text-xs text-[#e0e3e8] font-black">{selectedConductor?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-3 text-[9px] text-[#8c9198] uppercase tracking-[0.2em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#ffb68b] group-hover/item:scale-110 transition-transform">database</span> Manifest
                        </span>
                        <span className="text-xs text-[#e0e3e8] font-black">{manifest.length} Nodes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                form="create-trip-form"
                disabled={saving || !tripsRemaining}
                className="w-full h-24 bg-gradient-to-br from-[#cee5ff] via-[#a3cbf2] to-[#cee5ff] bg-[length:200%_auto] hover:bg-right text-[#003352] rounded-[2rem] font-black text-xl uppercase tracking-[0.25em] shadow-[0_25px_60px_rgba(163,203,242,0.2)] hover:shadow-[0_30px_70px_rgba(163,203,242,0.4)] transition-all duration-700 flex items-center justify-center gap-4 disabled:opacity-30 active:scale-[0.97] group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="material-symbols-outlined text-3xl group-hover:rotate-[360deg] transition-transform duration-700">security_update_good</span>
                {saving ? 'SYNCHRONIZING...' : 'DEPLOY MISSION'}
              </button>

              {!tripsRemaining && (
                <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                  <span className="material-symbols-outlined text-[#ffb4ab]">warning</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#ffb4ab]">Insufficient mission credits</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
