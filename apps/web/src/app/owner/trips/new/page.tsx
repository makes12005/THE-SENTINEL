'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import toast from 'react-hot-toast';

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
}

interface Staff {
  id: string;
  name: string;
  role: 'conductor' | 'driver';
  upcoming_trip?: {
    id: string;
    route_name: string | null;
    from_city: string | null;
    to_city: string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    status: string | null;
    hours_until_trip: number | null;
  } | null;
}

interface Operator {
  id: string;
  name: string;
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
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    route_id: '',
    conductor_id: '',
    driver_id: '',
    bus_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '08:00',
    assigned_operator_id: '',
    template_id: '',
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

  // Data Fetching
  const routes = useQuery<Route[]>({
    queryKey: ['agency-routes'],
    queryFn: async () => {
      const res: any = await get('/api/routes');
      return res.data;
    },
  });

  const buses = useQuery<Bus[]>({
    queryKey: ['agency-buses'],
    queryFn: async () => {
      const res: any = await get('/api/agency/buses');
      return res.data;
    },
  });

  const staff = useQuery<Staff[]>({
    queryKey: ['agency-staff'],
    queryFn: async () => {
      const res: any = await get('/api/agency/staff');
      return res.data;
    },
  });

  const operators = useQuery<Operator[]>({
    queryKey: ['owner-operators'],
    queryFn: async () => {
      const res: any = await get('/api/owner/operators');
      return res.data;
    },
  });

  const routeStops = useQuery<Stop[]>({
    queryKey: ['route-stops', form.route_id],
    queryFn: async () => {
      if (!form.route_id) return [];
      const res: any = await get(`/api/routes/${form.route_id}/stops`);
      return res.data;
    },
    enabled: !!form.route_id,
  });

  const conductors = staff.data?.filter(s => s.role === 'conductor') ?? [];
  const drivers = staff.data?.filter(s => s.role === 'driver') ?? [];

  const createMutation = useMutation({
    mutationFn: (body: any) => post('/api/trips', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-trips'] });
      toast.success('Trip created successfully');
      router.push('/owner/trips');
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error?.message ?? 'Failed to create trip');
    },
    onSettled: () => setSaving(false),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.route_id || !form.conductor_id || !form.scheduled_date) {
      toast.error('Route, Conductor, and Date are required');
      return;
    }
    setSaving(true);
    
    try {
      // Clean up empty strings to undefined for API
      const payload = {
        ...form,
        driver_id: form.driver_id || undefined,
        bus_id: form.bus_id || undefined,
        assigned_operator_id: form.assigned_operator_id || undefined,
      };
      
      const tripRes: any = await post('/api/trips', payload);
      const tripId = tripRes.data.id;

      // 1. Upload file if exists
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        // Using native fetch or axios because our 'post' helper might not handle FormData properly 
        // depending on implementation. Let's check api.ts later if needed, but for now assuming it works or using fetch.
        const token = localStorage.getItem('token');
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

      qc.invalidateQueries({ queryKey: ['owner-trips'] });
      toast.success('Trip and Manifest created successfully');
      router.push('/owner/trips');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPassenger = () => {
    if (!newPassenger.passenger_name || newPassenger.passenger_phone.length < 13 || !newPassenger.stop_id) {
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
  const selectedConductor = staff.data?.find(s => s.id === form.conductor_id);
  const selectedDriver = staff.data?.find(s => s.id === form.driver_id);
  const selectedBus = buses.data?.find(b => b.id === form.bus_id);

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] font-sans flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-[#6C63FF]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#0B3C5D]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#6C63FF]/2 rounded-full blur-[200px] pointer-events-none" />

      <div className="flex-grow max-w-7xl mx-auto w-full px-8 py-12 md:py-16 relative z-10">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link href="/owner/trips" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#6C63FF] hover:text-[#F1F5F9] transition-all mb-6 group">
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              RETURN TO MISSIONS
            </Link>
            <h1 className="text-4xl font-black text-[#F1F5F9] mb-2 tracking-tight uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Initialize Mission
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#475569]">
              CONFIGURING STRATEGIC TRANSIT DEPLOYMENT · ASSET ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </div>
          
          <div className="bg-[#1e293b]/30 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-4 border border-[#1e293b] shadow-xl">
            <div className="w-10 h-10 rounded-full bg-[#0b0f12] flex items-center justify-center border border-[#1e293b]">
              <span className="material-symbols-outlined text-[#FF7A00] animate-pulse">radar</span>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#475569] tracking-widest font-black">SYSTEM STATUS</p>
              <p className="text-sm font-black text-[#F1F5F9]">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form Area */}
          <form id="create-trip-form" onSubmit={handleSubmit} className="lg:col-span-2 space-y-10">
            {/* Section 1: Template Engine */}
            <section className="bg-[#1e293b]/10 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#0B3C5D]/40 group-hover:bg-[#0B3C5D] transition-all duration-500"></div>
              <div className="flex items-center gap-5 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-[#0b0f12] border border-[#1e293b] flex items-center justify-center text-[#0B3C5D] shadow-inner group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#F1F5F9] tracking-tight uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Template Engine</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569]">Automated Configuration Stack</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">SELECT MISSION TEMPLATE</label>
                  <div className="relative">
                    <select 
                      value={form.template_id}
                      onChange={(e) => setForm(f => ({ ...f, template_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#0B3C5D]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">Start from Scratch (Manual)</option>
                      <option value="temp_1">Route 12A - Morning Express (Daily)</option>
                      <option value="temp_2">Route 15B - Weekend Special (Interstate)</option>
                      <option value="temp_3">Corporate Charter - Default Protocol</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-[#0b0f12]/50 p-6 rounded-2xl border border-[#1e293b]">
                  <span className="material-symbols-outlined text-[#475569] text-[22px] mt-1">terminal</span>
                  <p className="text-[11px] text-[#64748b] leading-relaxed font-bold uppercase tracking-wide">
                    Selecting a template will auto-fill synchronized route geometry, assigned fleet units, and operational staff according to pre-defined mission protocols.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Deployment Parameters */}
            <section className="bg-[#1e293b]/10 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#6C63FF]/40 group-hover:bg-[#6C63FF] transition-all duration-500"></div>
              <div className="flex items-center gap-5 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-[#0b0f12] border border-[#1e293b] flex items-center justify-center text-[#6C63FF] shadow-inner group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#F1F5F9] tracking-tight uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Mission Parameters</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569]">Operational Deployment Data</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    TRANSIT ROUTE <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.route_id}
                      onChange={(e) => setForm(f => ({ ...f, route_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">IDENTIFY ROUTE...</option>
                      {routes.data?.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">route</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    DEPLOYMENT DATE <span className="text-[#FF7A00]">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className="w-full h-16 bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 text-[#F1F5F9] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6C63FF]/30 [color-scheme:dark] shadow-lg"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    DEPARTURE TIME (IST)
                  </label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full h-16 bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 text-[#F1F5F9] text-sm font-bold outline-none focus:ring-2 focus:ring-[#6C63FF]/30 [color-scheme:dark] shadow-lg"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    LEAD CONDUCTOR <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.conductor_id}
                      onChange={(e) => setForm(f => ({ ...f, conductor_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">ASSIGN CONDUCTOR...</option>
                      {conductors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">badge</span>
                  </div>
                  {selectedConductor?.upcoming_trip && (
                    <div className="mt-3 ml-4 flex items-start gap-3 bg-[#FF7A00]/10 border border-[#FF7A00]/30 rounded-xl px-4 py-3">
                      <span className="material-symbols-outlined text-[#FF7A00] text-[18px] mt-0.5">warning</span>
                      <p className="text-[11px] text-[#FFB978] font-medium">
                        <span className="font-bold">{selectedConductor.name}</span> has a trip:{' '}
                        {selectedConductor.upcoming_trip.from_city} → {selectedConductor.upcoming_trip.to_city}
                        {selectedConductor.upcoming_trip.scheduled_time && (
                          <> starting at {selectedConductor.upcoming_trip.scheduled_time.slice(0, 5)}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    PRIMARY DRIVER (OPTIONAL)
                  </label>
                  <div className="relative">
                    <select
                      value={form.driver_id}
                      onChange={(e) => setForm(f => ({ ...f, driver_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">ASSIGN DRIVER...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">steering_wheel</span>
                  </div>
                  {selectedDriver?.upcoming_trip && (
                    <div className="mt-3 ml-4 flex items-start gap-3 bg-[#FF7A00]/10 border border-[#FF7A00]/30 rounded-xl px-4 py-3">
                      <span className="material-symbols-outlined text-[#FF7A00] text-[18px] mt-0.5">warning</span>
                      <p className="text-[11px] text-[#FFB978] font-medium">
                        <span className="font-bold">{selectedDriver.name}</span> has a trip:{' '}
                        {selectedDriver.upcoming_trip.from_city} → {selectedDriver.upcoming_trip.to_city}
                        {selectedDriver.upcoming_trip.scheduled_time && (
                          <> starting at {selectedDriver.upcoming_trip.scheduled_time.slice(0, 5)}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    FLEET UNIT (VEHICLE)
                  </label>
                  <div className="relative">
                    <select
                      value={form.bus_id}
                      onChange={(e) => setForm(f => ({ ...f, bus_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">ASSIGN VEHICLE...</option>
                      {buses.data?.map(b => (
                        <option key={b.id} value={b.id}>{b.number_plate} ({b.model || 'Standard'})</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">directions_bus</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block mb-3 ml-4">
                    FIELD OPERATOR
                  </label>
                  <div className="relative">
                    <select
                      value={form.assigned_operator_id}
                      onChange={(e) => setForm(f => ({ ...f, assigned_operator_id: e.target.value }))}
                      className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-full px-8 py-5 text-[#F1F5F9] font-bold appearance-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all cursor-pointer outline-none shadow-lg text-sm"
                    >
                      <option value="">DELEGATE TO OPERATOR...</option>
                      {operators.data?.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">engineering</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Passenger Manifest */}
            <section className="bg-[#1e293b]/10 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#FF7A00]/40 group-hover:bg-[#FF7A00] transition-all duration-500"></div>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#0b0f12] border border-[#1e293b] flex items-center justify-center text-[#FF7A00] shadow-inner group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">group_add</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#F1F5F9] tracking-tight uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Passenger Manifest</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569]">Data Synchronization Core</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#FF7A00]/10 px-5 py-2 rounded-full border border-[#FF7A00]/20">
                  <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse"></span>
                  <span className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest">
                    {manifest.length} ACTIVE RECORDS
                  </span>
                </div>
              </div>

              {manifest.length > 0 && (
                <div className="mb-10 overflow-hidden border border-[#1e293b] rounded-[1.5rem] bg-[#0b0f12]/50 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0b0f12]">
                      <tr className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em]">
                        <th className="px-8 py-5">PASSENGER IDENTITY</th>
                        <th className="px-8 py-5">COMMS CHANNEL</th>
                        <th className="px-8 py-5">TARGET STOP</th>
                        <th className="px-8 py-5 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {manifest.map((p, idx) => {
                        const stop = routeStops.data?.find(s => s.id === p.stop_id);
                        return (
                          <tr key={idx} className="hover:bg-[#1e293b]/20 transition-colors group/row">
                            <td className="px-8 py-5 text-sm font-black text-[#F1F5F9] uppercase">{p.passenger_name}</td>
                            <td className="px-8 py-5 text-sm text-[#475569] font-mono font-bold">{p.passenger_phone}</td>
                            <td className="px-8 py-5 text-sm text-[#6C63FF] font-black uppercase">{stop?.name || 'SYNCING...'}</td>
                            <td className="px-8 py-5 text-right">
                              <button 
                                type="button" 
                                onClick={() => removePassenger(idx)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#ff4d4d] hover:bg-[#ff4d4d]/10 transition-all"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
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
                <div className="bg-[#0b0f12] border border-[#1e293b] p-10 rounded-[2rem] space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C63FF]/5 blur-3xl rounded-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block ml-4">LEGAL NAME</label>
                      <input 
                        type="text"
                        value={newPassenger.passenger_name}
                        onChange={(e) => setNewPassenger({ ...newPassenger, passenger_name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full h-14 bg-[#181c20] border border-[#1e293b] rounded-full px-8 text-sm text-[#F1F5F9] font-bold outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all placeholder:text-[#334155]"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block ml-4">IDENTITY PHONE</label>
                      <input 
                        type="text"
                        value={newPassenger.passenger_phone}
                        onChange={(e) => setNewPassenger({ ...newPassenger, passenger_phone: e.target.value })}
                        placeholder="+91XXXXXXXXXX"
                        className="w-full h-14 bg-[#181c20] border border-[#1e293b] rounded-full px-8 text-sm text-[#F1F5F9] font-mono font-bold outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all placeholder:text-[#334155]"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block ml-4">PICKUP VECTOR (STOP)</label>
                      <div className="relative">
                        <select
                          value={newPassenger.stop_id}
                          onChange={(e) => setNewPassenger({ ...newPassenger, stop_id: e.target.value })}
                          className="w-full h-14 bg-[#181c20] border border-[#1e293b] rounded-full px-8 text-sm text-[#F1F5F9] font-bold outline-none focus:ring-2 focus:ring-[#6C63FF]/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">SELECT PICKUP POINT...</option>
                          {routeStops.data?.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (STOP #{s.sequence_number})</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none">location_on</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-5 pt-4 relative z-10">
                    <button 
                      type="button"
                      onClick={() => setShowAddPassenger(false)}
                      className="px-8 h-14 rounded-full border border-[#1e293b] hover:bg-[#1e293b] text-[10px] font-black text-[#475569] hover:text-[#F1F5F9] transition-all uppercase tracking-widest"
                    >
                      Abort Entry
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddPassenger}
                      className="px-12 h-14 bg-gradient-to-r from-[#6C63FF] to-[#0B3C5D] text-[#F1F5F9] rounded-full font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_25px_rgba(108,99,255,0.4)] transition-all active:scale-95 shadow-lg"
                    >
                      Commit Record
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    className={`h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all duration-500 group ${uploadedFile ? 'border-[#6C63FF] bg-[#6C63FF]/5 shadow-[0_0_30px_rgba(108,99,255,0.1)]' : 'border-[#1e293b] hover:border-[#6C63FF]/50 hover:bg-[#1c2024]'}`}
                  >
                    {uploadedFile ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center shadow-lg border border-[#6C63FF]/30">
                          <span className="material-symbols-outlined text-3xl text-[#6C63FF]">database_upload</span>
                        </div>
                        <div className="text-center">
                          <span className="block font-black text-[#F1F5F9] text-sm truncate max-w-[250px] mb-1 uppercase tracking-tight">{uploadedFile.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="text-[10px] text-[#ff4d4d] uppercase font-black tracking-widest hover:text-[#ffDAD6] transition-colors"
                          >
                            Purge Payload
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-5xl text-[#475569] group-hover:text-[#6C63FF] transition-all duration-700">upload_file</span>
                        <div className="text-center">
                          <span className="block font-black text-[#F1F5F9] text-sm mb-1 uppercase tracking-widest">Upload Dataset</span>
                          <span className="block text-[9px] text-[#475569] uppercase font-bold tracking-[0.2em]">CSV / EXCEL / XLSX</span>
                        </div>
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!form.route_id) {
                        toast.error('Identify target route first');
                        return;
                      }
                      setShowAddPassenger(true);
                    }}
                    className="h-40 border-2 border-dashed border-[#1e293b] rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-[#FF7A00]/50 hover:bg-[#1c2024] transition-all duration-500 group"
                  >
                    <span className="material-symbols-outlined text-5xl text-[#475569] group-hover:text-[#FF7A00] transition-all duration-700">person_add</span>
                    <div className="text-center">
                      <span className="block font-black text-[#F1F5F9] text-sm mb-1 uppercase tracking-widest">Manual Injection</span>
                      <span className="block text-[9px] text-[#475569] uppercase font-bold tracking-[0.2em]">Single Record Protocol</span>
                    </div>
                  </button>
                </div>
              )}
            </section>
          </form>

          {/* Sidebar Command Overview */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-8">
              <div className="bg-[#1e293b]/20 backdrop-blur-3xl border border-[#1e293b] rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#6C63FF]/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-[#6C63FF]/10 transition-all duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0B3C5D]/5 rounded-full -ml-24 -mb-24 blur-[80px] group-hover:bg-[#0B3C5D]/10 transition-all duration-1000"></div>
                
                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-[#F1F5F9] mb-12 border-b border-[#1e293b] pb-10 flex items-center justify-between tracking-tight uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Command Overview
                    <span className="material-symbols-outlined text-[#6C63FF] animate-pulse">monitoring</span>
                  </h3>
                  
                  <div className="space-y-12">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#475569]">MISSION STATUS</span>
                      <span className="bg-[#0b0f12] text-[#FF7A00] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[#FF7A00]/20 shadow-[0_0_20px_rgba(255,122,0,0.1)]">
                        PRE-DEPLOYMENT
                      </span>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#475569] block ml-2">TARGET SECTOR (ROUTE)</span>
                      <div className="bg-[#0b0f12]/60 p-6 rounded-[2rem] border border-[#1e293b] group-hover:border-[#6C63FF]/30 transition-all duration-500 shadow-inner">
                        <p className="text-xl text-[#F1F5F9] font-black tracking-tight leading-tight uppercase">
                          {selectedRoute ? selectedRoute.name : 'Sector Unidentified'}
                        </p>
                        {selectedRoute && (
                          <div className="flex items-center gap-3 mt-4">
                            <span className="material-symbols-outlined text-[16px] text-[#6C63FF]">multiple_stop</span>
                            <p className="text-[10px] text-[#475569] font-black uppercase tracking-[0.15em]">
                              {selectedRoute.from_city} <span className="text-[#6C63FF] mx-2">{" >> "}</span> {selectedRoute.to_city}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#0b0f12]/40 p-6 rounded-2xl border border-[#1e293b] shadow-inner text-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#475569] block mb-3">DEPLOY DATE</span>
                        <p className="text-xs font-black text-[#F1F5F9] font-mono tracking-widest">{form.scheduled_date || '-- / -- / --'}</p>
                      </div>
                      <div className="bg-[#0b0f12]/40 p-6 rounded-2xl border border-[#1e293b] shadow-inner text-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#475569] block mb-3">TIME (IST)</span>
                        <p className="text-xs font-black text-[#F1F5F9] font-mono tracking-widest">{form.scheduled_time || '-- : --'}</p>
                      </div>
                    </div>

                    <div className="bg-[#0b0f12]/80 rounded-[2rem] p-8 space-y-6 border border-[#1e293b] shadow-2xl">
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-4 text-[9px] text-[#475569] uppercase tracking-[0.25em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#6C63FF] group-hover/item:scale-125 transition-transform duration-500">directions_bus</span> UNIT
                        </span>
                        <span className="text-xs text-[#F1F5F9] font-black">{selectedBus?.number_plate || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-4 text-[9px] text-[#475569] uppercase tracking-[0.25em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#6C63FF] group-hover/item:scale-125 transition-transform duration-500">shield_person</span> STAFF
                        </span>
                        <span className="text-xs text-[#F1F5F9] font-black truncate max-w-[120px]">{selectedConductor?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="flex items-center gap-4 text-[9px] text-[#475569] uppercase tracking-[0.25em] font-black">
                          <span className="material-symbols-outlined text-[20px] text-[#FF7A00] group-hover/item:scale-125 transition-transform duration-500">database</span> NODES
                        </span>
                        <span className="text-xs text-[#F1F5F9] font-black">{manifest.length} ENTRIES</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                form="create-trip-form"
                disabled={saving}
                className="w-full h-24 bg-gradient-to-br from-[#6C63FF] via-[#0B3C5D] to-[#6C63FF] bg-[length:200%_auto] hover:bg-right text-[#F1F5F9] rounded-[2.5rem] font-black text-xl uppercase tracking-[0.4em] shadow-[0_25px_60px_rgba(108,99,255,0.2)] hover:shadow-[0_30px_80px_rgba(108,99,255,0.4)] transition-all duration-1000 flex items-center justify-center gap-5 disabled:opacity-30 active:scale-[0.96] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <span className="material-symbols-outlined text-4xl group-hover:rotate-[360deg] transition-transform duration-1000 ease-in-out">bolt</span>
                {saving ? 'SYNCHRONIZING...' : 'INITIALIZE MISSION'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Footer Branding */}
      <footer className="w-full py-10 mt-auto border-t border-[#1e293b] flex flex-col md:flex-row justify-between items-center px-12 gap-6 opacity-20 hover:opacity-40 transition-opacity">
        <div className="font-manrope text-[9px] font-black uppercase tracking-[0.4em] text-[#475569]">
          © 2026 THE SENTINEL · MISSION CRITICAL INFRASTRUCTURE PROTOCOL
        </div>
        <div className="flex gap-10">
          <span className="font-manrope text-[9px] font-black uppercase tracking-[0.3em] text-[#475569] flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#6C63FF]"></span>
            SECTOR: GUJARAT_HQ_01
          </span>
          <span className="font-manrope text-[9px] font-black uppercase tracking-[0.3em] text-[#475569] flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#FF7A00]"></span>
            LOG: TRP_INIT_V5
          </span>
        </div>
      </footer>
    </div>
  );
}
