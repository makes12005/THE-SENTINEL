'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, postForm } from '@/lib/api';
import { TableSkeleton } from '@/components/ui';

interface Trip {
  id: string;
  status: string;
  scheduled_date: string;
  route: { name: string; from_city: string; to_city: string };
  bus_number: string | null;
  passenger_count: number;
}

interface TripDetails {
  id: string;
  route_id: string;
}

interface Stop {
  id: string;
  name: string;
}

type ReviewPassenger = {
  name: string;
  phone: string;
  stop_name: string;
  pickup_point: string;
  seat_no: string;
};

function UploadModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ReviewPassenger[]>([]);

  const tripDetailsQuery = useQuery<TripDetails>({
    queryKey: ['trip-detail-for-upload', trip.id],
    queryFn: () => get(`/api/trips/${trip.id}`),
  });

  const stopsQuery = useQuery<Stop[]>({
    queryKey: ['trip-upload-stops', trip.id, tripDetailsQuery.data?.route_id],
    enabled: !!tripDetailsQuery.data?.route_id,
    queryFn: () => get(`/api/routes/${tripDetailsQuery.data!.route_id}/stops`),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const form = new FormData();
      form.append('file', file);
      return postForm<{ raw_passengers?: Array<Partial<ReviewPassenger>> }>(`/api/trips/${trip.id}/passengers/upload`, form);
    },
    onMutate: () => setStep(2),
    onSuccess: (result) => {
      setRows(
        (result.raw_passengers ?? []).map((row) => ({
          name: String(row.name ?? ''),
          phone: String(row.phone ?? ''),
          stop_name: String(row.stop_name ?? ''),
          pickup_point: String(row.pickup_point ?? ''),
          seat_no: String(row.seat_no ?? ''),
        }))
      );
      setStep(3);
    },
    onError: (err: any) => {
      setStep(1);
      toast.error(err?.response?.data?.error?.message ?? 'Upload failed');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => post(`/api/trips/${trip.id}/passengers/confirm`, { passengers: rows }),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      toast.success(`${result.saved ?? rows.length} passengers added to trip`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Confirmation failed');
    },
  });

  const stopNames = new Set((stopsQuery.data ?? []).map((stop) => stop.name.trim().toLowerCase()));
  const rowStatuses = useMemo(() => {
    return rows.map((row) => {
      if (!row.name.trim()) return 'Missing required field';
      if (!/^\+91\d{10}$/.test(row.phone.trim())) return 'Invalid phone format';
      if (!row.stop_name.trim()) return 'Missing required field';
      if (stopNames.size > 0 && !stopNames.has(row.stop_name.trim().toLowerCase())) return 'Stop not found';
      return 'Valid';
    });
  }, [rows, stopNames]);

  const validCount = rowStatuses.filter((status) => status === 'Valid').length;
  const errorCount = rowStatuses.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[28px] border border-[#42474e]/40 bg-[#181c20] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#42474e]/30 px-8 py-6">
          <div>
            <h2 className="text-xl font-black text-[#cee5ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              PASSENGER UPLOAD REVIEW
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
              {trip.route.from_city} {'->'} {trip.route.to_city}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-[#1c2024] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#c2c7ce]">
            Close
          </button>
        </div>

        <div className="px-8 py-6">
          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${step >= item ? 'bg-[#a3cbf2] text-[#003352]' : 'bg-[#1c2024] text-[#8c9198]'}`}>
                {item}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-[24px] border-2 border-dashed border-[#42474e]/50 bg-[#0b0f12] p-10 text-center">
                <div className="mb-4 text-4xl text-[#8c9198]">upload_file</div>
                <p className="text-sm font-bold text-[#e0e3e8]">Upload passenger file</p>
                <p className="mt-2 text-xs text-[#8c9198]">Accepts .xlsx, .csv, .pdf, .jpg, .jpeg, .png</p>
                <input
                  type="file"
                  accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png"
                  className="mt-5 block w-full text-sm text-[#c2c7ce]"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                {file && <p className="mt-4 text-sm font-bold text-[#a3cbf2]">{file.name}</p>}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => previewMutation.mutate()}
                  disabled={!file || previewMutation.isPending}
                  className="rounded-full bg-[#a3cbf2] px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#003352] disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#42474e] border-t-[#a3cbf2]" />
              <p className="mt-8 text-xl font-black text-[#cee5ff]">Reading your file...</p>
              <p className="mt-2 text-sm text-[#8c9198]">Extracting passenger data...</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-5 flex items-center justify-between rounded-[20px] bg-[#0b0f12] px-5 py-4">
                <p className="text-sm font-bold text-[#e0e3e8]">
                  {validCount} valid, {errorCount} errors. Fix errors before confirming.
                </p>
                <button
                  onClick={() => setRows((current) => [...current, { name: '', phone: '+91', stop_name: '', pickup_point: '', seat_no: '' }])}
                  className="rounded-full bg-[#1c2024] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#cee5ff]"
                >
                  + Add row
                </button>
              </div>

              <div className="overflow-x-auto rounded-[24px] border border-[#42474e]/30">
                <table className="w-full border-collapse">
                  <thead className="bg-[#1c2024] text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8c9198]">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Stop</th>
                      <th className="px-4 py-3">Pickup Point</th>
                      <th className="px-4 py-3">Seat No</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#42474e]/20 bg-[#181c20]">
                    {rows.map((row, index) => (
                      <tr key={`${index}-${row.name}-${row.phone}`}>
                        <td className="px-4 py-3 text-sm text-[#c2c7ce]">{index + 1}</td>
                        {(['name', 'phone', 'stop_name', 'pickup_point', 'seat_no'] as const).map((field) => (
                          <td key={field} className="px-4 py-3">
                            <input
                              value={row[field]}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, [field]: event.target.value } : item
                                  )
                                )
                              }
                              className="w-full rounded-lg border border-[#42474e]/40 bg-[#0b0f12] px-3 py-2 text-sm text-[#e0e3e8] outline-none"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm font-bold">
                          <span className={rowStatuses[index] === 'Valid' ? 'text-[#86efac]' : 'text-[#ffb4ab]'}>
                            {rowStatuses[index]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            className="rounded-full bg-[#93000a]/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ffb4ab]"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-full border border-[#42474e]/40 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#c2c7ce]"
                >
                  Upload another file
                </button>
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={errorCount > 0 || confirmMutation.isPending || rows.length === 0}
                  className="rounded-full bg-[#a3cbf2] px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#003352] disabled:opacity-50"
                >
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
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
    (trip) => trip.passenger_count === 0 && !['completed', 'done', 'finished'].includes(trip.status)
  );

  return (
    <div className="min-h-screen bg-[#101418] pb-12 text-[#e0e3e8]">
      <div className="fixed right-0 top-0 h-[600px] w-[600px] rounded-full bg-[#ffb4ab]/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#a3cbf2]/3 blur-[100px] pointer-events-none" />

      <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-[#ffffff08] bg-[#101418]/95 px-8 backdrop-blur-md">
        <Link href="/operator/trips" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#42474e]/40 bg-[#1c2024] text-[#8c9198] transition-colors hover:text-[#e0e3e8]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[#cee5ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            PENDING PASSENGER LIST
          </h1>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
            Action required for departure
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl space-y-8 px-8 pt-8">
        <div className="border-b border-[#42474e]/20 pb-6">
          <h2 className="text-4xl font-black text-[#e0e3e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pending Passenger List
          </h2>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]/70">
            Upload, review, fix, confirm
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-[#42474e]/20 bg-[#181c20] p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : pendingTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <span className="material-symbols-outlined text-[64px] text-[#42474e]">check_circle</span>
            <p className="text-lg font-bold text-[#8c9198]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              All Clear
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]/60">
              All trips have passenger lists uploaded.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {pendingTrips.map((trip) => (
              <div key={trip.id} className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-xl border border-[#42474e]/10 bg-[#181c20] p-6 shadow-lg transition-colors hover:border-[#42474e]/30 md:flex-row md:items-center">
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ffb4ab]/50" />
                <div className="w-full pl-2 md:w-auto">
                  <div className="mb-2 flex items-center gap-4">
                    <span className="rounded-full border border-[#42474e]/20 bg-[#262a2f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                      Vehicle
                    </span>
                    <span className="font-mono text-xl font-bold tracking-wider text-[#e0e3e8]">
                      {trip.bus_number || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#c2c7ce]">
                    <span className="text-base font-bold text-[#a3cbf2]">{trip.route.from_city}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#8c9198]">arrow_forward</span>
                    <span className="text-base font-bold text-[#a3cbf2]">{trip.route.to_city}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-[#262a2f] bg-[#1c2024] px-4 py-3">
                  <span className="material-symbols-outlined text-[18px] text-[#ffb68b]">schedule</span>
                  <span className="font-mono text-base font-bold text-[#ffb68b]">{trip.scheduled_date}</span>
                </div>

                <div className="flex w-full gap-3 md:w-auto">
                  <Link
                    href={`/operator/trips/${trip.id}`}
                    className="flex h-14 items-center justify-center gap-2 rounded-lg border border-[#a3cbf2]/30 bg-transparent px-5 text-[10px] font-bold uppercase tracking-widest text-[#a3cbf2] transition-colors hover:bg-[#a3cbf2]/10"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_search</span>
                    View Trip
                  </Link>
                  <button
                    onClick={() => setSelectedTrip(trip)}
                    className="flex h-14 items-center justify-center gap-2 rounded-lg bg-[#a3cbf2] px-6 text-[10px] font-bold uppercase tracking-widest text-[#003352] shadow-xl shadow-black/40 transition-colors active:scale-[0.98] hover:bg-[#cee5ff]"
                  >
                    Upload Now
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
