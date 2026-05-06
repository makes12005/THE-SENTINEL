'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, postForm } from '@/lib/api';
import { TableSkeleton } from '@/components/ui';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  conductor: { name: string };
  bus_number: string | null;
  passenger_count: number;
}

function UploadModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const form = new FormData();
      form.append('file', file);
      return postForm<{ uploaded: number; errors?: Array<{ row: number; errors: string[] }> }>(`/api/trips/${trip.id}/passengers/upload`, form);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      if (result?.errors?.length) {
        toast.error(`Uploaded ${result.uploaded} rows, ${result.errors.length} row errors`);
      } else {
        toast.success(`${result?.uploaded ?? 0} passengers uploaded`);
      }
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Upload failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-[#42474e]/40 bg-[#181c20] shadow-2xl">
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#42474e]/30">
          <div>
            <h2 className="text-lg font-black text-[#ffb4ab] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              UPLOAD MANIFEST
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-1">
              {trip.bus_number || '—'} · {trip.route.from_city} → {trip.route.to_city}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="px-8 py-6">
          <label className="block">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mb-3">Passenger CSV File</p>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-[#a3cbf2]/50 bg-[#a3cbf2]/5' : 'border-[#42474e]/50 hover:border-[#42474e] bg-[#0b0f12]'}`}>
              <span className="material-symbols-outlined text-[40px] text-[#8c9198] block mb-3">upload_file</span>
              {file ? (
                <p className="text-sm font-bold text-[#a3cbf2]">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-[#c2c7ce]">Drop CSV file here or click to browse</p>
                  <p className="text-[10px] text-[#8c9198] mt-1">Format: name, phone, stop_name</p>
                </>
              )}
              <input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </label>
        </div>
        <div className="flex gap-3 px-8 pb-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#1c2024] border border-[#42474e]/50 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] hover:bg-[#262a2f] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
            className="flex-1 rounded-lg bg-[#ffb4ab] py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#690005] hover:bg-[#ffdad6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
            {mutation.isPending ? 'Uploading...' : 'Upload Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingPassengerPage() {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => get('/api/trips'),
    refetchInterval: 30_000,
  });

  const pendingTrips = (trips ?? []).filter(
    (t) => t.passenger_count === 0 && !['completed', 'done', 'finished'].includes(t.status)
  );

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      {/* Atmospheric */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#ffb4ab]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#a3cbf2]/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <Link href="/operator/trips" className="w-9 h-9 rounded-lg bg-[#1c2024] flex items-center justify-center text-[#8c9198] hover:text-[#e0e3e8] transition-colors border border-[#42474e]/40">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            PENDING PASSENGER LIST
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">
            ACTION REQUIRED FOR DEPARTURE
          </p>
        </div>
        {pendingTrips.length > 0 && (
          <div className="flex items-center gap-2 bg-[#93000a]/20 border border-[#ffb4ab]/30 rounded-full px-4 py-2">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[18px]">warning</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb4ab]">{pendingTrips.length} REQUIRED</span>
          </div>
        )}
      </header>

      <div className="px-8 pt-8 max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Section header */}
        <div className="flex flex-col border-b border-[#42474e]/20 pb-6">
          <h2 className="text-4xl font-black text-[#e0e3e8] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pending Passenger List
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-2 opacity-70">
            ACTION REQUIRED FOR DEPARTURE
          </p>
        </div>

        {isLoading ? (
          <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : pendingTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="material-symbols-outlined text-[64px] text-[#42474e]">check_circle</span>
            <p className="text-[#8c9198] text-lg font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              All Clear
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]/60">
              All trips have passenger lists uploaded.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {pendingTrips.map((trip) => (
              <div key={trip.id} className="bg-[#181c20] border border-[#42474e]/10 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group hover:border-[#42474e]/30 transition-colors shadow-lg">
                {/* Critical left border accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffb4ab]/50" />

                <div className="flex flex-col gap-1 pl-2 w-full md:w-auto">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] bg-[#262a2f] px-3 py-1 rounded-full border border-[#42474e]/20">
                      VEHICLE
                    </span>
                    <span className="font-mono text-xl font-bold text-[#e0e3e8] tracking-wider">
                      {trip.bus_number || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#c2c7ce]">
                    <span className="font-bold text-base text-[#a3cbf2]">{trip.route.from_city}</span>
                    <span className="material-symbols-outlined text-[#8c9198] text-[18px]">arrow_forward</span>
                    <span className="font-bold text-base text-[#a3cbf2]">{trip.route.to_city}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198] mt-1">
                    Conductor: {trip.conductor.name}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#1c2024] px-4 py-3 rounded-lg border border-[#262a2f] w-full md:w-auto justify-center md:justify-start">
                  <span className="material-symbols-outlined text-[#ffb68b] text-[18px]">schedule</span>
                  <span className="font-mono font-bold text-[#ffb68b] text-base">{trip.scheduled_date}</span>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <Link href={`/operator/trips/${trip.id}`}
                    className="h-14 px-5 bg-transparent border border-[#a3cbf2]/30 text-[#a3cbf2] text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-[#a3cbf2]/10 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">person_search</span>
                    View Trip
                  </Link>
                  <button
                    onClick={() => setSelectedTrip(trip)}
                    className="h-14 px-6 bg-[#a3cbf2] text-[#003352] text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-[#cee5ff] transition-colors active:scale-[0.98] shadow-xl shadow-black/40"
                  >
                    UPLOAD NOW
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTrip && <UploadModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
    </div>
  );
}
