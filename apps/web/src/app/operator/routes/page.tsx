'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { TableSkeleton, PageHeader } from '@/components/ui';
import toast from 'react-hot-toast';

interface Route {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  stops: string[];
  created_at: string;
}

interface CreateRouteBody {
  name:      string;
  from_city: string;
  to_city:   string;
  stops:     string[];
}

export default function RoutesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateRouteBody>({ name: '', from_city: '', to_city: '', stops: [] });
  const [stopsInput, setStopsInput] = useState('');

  const { data: routes, isLoading } = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn:  () => get<Route[]>('/api/routes'),
  });

  const createRoute = useMutation({
    mutationFn: (body: CreateRouteBody) => post<Route>('/api/routes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route created');
      setShowModal(false);
      setForm({ name: '', from_city: '', to_city: '', stops: [] });
      setStopsInput('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Failed to create route'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const stops = stopsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!form.name || !form.from_city || !form.to_city) return toast.error('Fill all required fields');
    createRoute.mutate({ ...form, stops });
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Routes" subtitle={`${routes?.length ?? 0} Routes`} />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Route
        </button>
      </header>

      <div className="p-8">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                  <th className="px-6 pb-2">Name</th>
                  <th className="px-6 pb-2">Route</th>
                  <th className="px-6 pb-2">Stops</th>
                  <th className="px-6 pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {(routes ?? []).map((route) => (
                  <tr key={route.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
                    <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8]">{route.name}</td>
                    <td className="px-6 py-4 text-sm text-[#c2c7ce]">
                      {route.from_city} → {route.to_city}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(route.stops ?? []).slice(0, 4).map((stop: string) => (
                          <span key={stop} className="px-2 py-0.5 bg-[#31353a] rounded-full text-[0.6875rem] text-[#c2c7ce]">
                            {stop}
                          </span>
                        ))}
                        {(route.stops ?? []).length > 4 && (
                          <span className="px-2 py-0.5 bg-[#31353a] rounded-full text-[0.6875rem] text-[#c2c7ce]">
                            +{route.stops.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 rounded-r-xl text-xs font-mono text-[#8c9198]">
                      {new Date(route.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
                {!routes?.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                      No routes yet. Create your first route.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Route Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#181c20] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-[#42474e]/30">
            <h2 className="text-xl font-black text-[#a3cbf2] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              New Route
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Route Name',      key: 'name',      placeholder: 'e.g. Mumbai Express' },
                { label: 'From City',       key: 'from_city', placeholder: 'e.g. Surat' },
                { label: 'To City',         key: 'to_city',   placeholder: 'e.g. Vadodara' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">
                    {label} *
                  </label>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1.5">
                  Stops (comma-separated)
                </label>
                <input
                  value={stopsInput}
                  onChange={(e) => setStopsInput(e.target.value)}
                  placeholder="Surat, Bharuch, Vadodara"
                  className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoute.isPending}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-[#a3cbf2] text-[#003353] hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {createRoute.isPending ? 'Creating…' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
