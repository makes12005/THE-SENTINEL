'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, post, postForm } from '@/lib/api';
import { TableSkeleton, PageHeader, StatusBadge } from '@/components/ui';
import toast from 'react-hot-toast';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  started_at: string | null;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  _count?: { trip_passengers: number };
}

interface Route { id: string; name: string; from_city: string; to_city: string; }
interface User  { id: string; name: string; role: string; }

function CreateTripModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ route_id: '', conductor_id: '', scheduled_date: '' });

  const { data: routes }     = useQuery<Route[]>({ queryKey: ['routes'],  queryFn: () => get<Route[]>('/api/routes') });
  const { data: conductors } = useQuery<User[]>({
    queryKey: ['conductors'],
    queryFn:  () => get<User[]>('/api/agency/members').then((m) => (m as User[]).filter((u) => u.role === 'conductor')),
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => post('/api/trips', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create trip'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#181c20] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-[#42474e]/30">
        <h2 className="text-xl font-black text-[#a3cbf2] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Create Trip
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">Route *</label>
            <select
              value={form.route_id}
              onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value }))}
              className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            >
              <option value="">Select a route</option>
              {(routes ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.from_city} → {r.to_city})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">Conductor *</label>
            <select
              value={form.conductor_id}
              onChange={(e) => setForm((f) => ({ ...f, conductor_id: e.target.value }))}
              className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            >
              <option value="">Select a conductor</option>
              {(conductors ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">Scheduled Date *</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-[#a3cbf2] text-[#003353] hover:brightness-110 disabled:opacity-50 transition-all">
              {create.isPending ? 'Creating…' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CsvUploadModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      return postForm(`/api/trips/${tripId}/passengers/upload`, form);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['trip', tripId] });
      toast.success(`${data?.inserted ?? 'Passengers'} passengers uploaded`);
      onClose();
    },
    onError: (e: any) => {
      const details = e?.response?.data?.error?.details;
      if (Array.isArray(details)) setErrors(details.map((d: any) => d.error ?? String(d)));
      else toast.error(e?.response?.data?.error?.message ?? 'Upload failed');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#181c20] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-[#42474e]/30">
        <h2 className="text-xl font-black text-[#a3cbf2] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Upload Passengers
        </h2>
        <p className="text-xs text-[#8c9198] mb-6">CSV/XLSX: name, phone (+91…), stop_name. Max 100 rows.</p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#42474e] rounded-xl p-10 text-center cursor-pointer hover:border-[#a3cbf2]/60 transition-colors"
        >
          <span className="material-symbols-outlined text-4xl text-[#42474e] block mb-3">upload_file</span>
          <p className="text-sm text-[#c2c7ce]">
            {file ? file.name : 'Click to choose CSV or XLSX'}
          </p>
        </div>
        <input
          ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErrors([]); }}
        />

        {errors.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-[#ffb4ab]">• {err}</p>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] transition-all">
            Cancel
          </button>
          <button
            onClick={() => file && upload.mutate(file)}
            disabled={!file || upload.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-[#a3cbf2] text-[#003353] hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const [showCreate,  setShowCreate]  = useState(false);
  const [uploadTripId, setUploadTripId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router       = useRouter();

  // Open create modal if ?modal=create
  useEffect(() => {
    if (searchParams.get('modal') === 'create') setShowCreate(true);
  }, [searchParams]);

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn:  () => get<Trip[]>('/api/trips'),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Trips" subtitle={`${trips?.length ?? 0} Trips`} />
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Trip
        </button>
      </header>

      <div className="p-8">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  <th className="px-6 pb-2">Route</th>
                  <th className="px-6 pb-2">Conductor</th>
                  <th className="px-6 pb-2">Passengers</th>
                  <th className="px-6 pb-2">Date</th>
                  <th className="px-6 pb-2">Status</th>
                  <th className="px-6 pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(trips ?? []).map((trip) => (
                  <tr key={trip.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
                    <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">
                      {trip.route?.from_city} → {trip.route?.to_city}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">{trip.conductor?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce] font-mono">
                      {trip._count?.trip_passengers ?? 0}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#8c9198]">{trip.scheduled_date}</td>
                    <td className="px-6 py-4"><StatusBadge status={trip.status} /></td>
                    <td className="px-6 py-4 rounded-r-xl text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setUploadTripId(trip.id)}
                          className="text-xs text-[#c4c0ff] hover:underline uppercase tracking-wider"
                          title="Upload Passengers"
                        >
                          <span className="material-symbols-outlined text-[16px] align-middle">upload</span>
                        </button>
                        <Link
                          href={`/operator/trips/${trip.id}`}
                          className="text-xs text-[#a3cbf2] hover:underline uppercase tracking-wider"
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!trips?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                      No trips yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate  && <CreateTripModal    onClose={() => { setShowCreate(false); router.replace('/operator/trips'); }} />}
      {uploadTripId && <CsvUploadModal   tripId={uploadTripId} onClose={() => setUploadTripId(null)} />}
    </div>
  );
}
