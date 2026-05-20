'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import toast from 'react-hot-toast';

type RouteListItem = {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
  is_active: boolean;
  stop_count: number;
  created_at: string;
  created_by_name: string | null;
};

export default function OwnerRoutesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const routes = useQuery<RouteListItem[]>({
    queryKey: ['routes'],
    queryFn: () => get<RouteListItem[]>('/api/routes'),
  });

  const deleteRoute = useMutation({
    mutationFn: (id: string) => del(`/api/routes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to delete route'),
  });

  const duplicateRoute = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      post(`/api/routes/${id}/duplicate`, { new_name: newName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route duplicated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Unable to duplicate route'),
  });

  const filteredRoutes = (routes.data ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.from_city?.toLowerCase().includes(q) || r.to_city?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] font-sans">
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-[#6C63FF]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#0B3C5D]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 px-8 py-12 max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6C63FF] mb-2">Routes</p>
            <h1 className="text-3xl font-black text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              ROUTE MANAGEMENT
            </h1>
            <p className="mt-2 text-sm text-[#475569]">
              {filteredRoutes.length} routes in your agency
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search routes..."
                className="w-72 rounded-xl border border-[#1e293b] bg-[#1e293b]/40 pl-12 pr-4 py-3 text-sm text-[#F1F5F9] outline-none focus:border-[#6C63FF]/50"
              />
            </div>
            <Link
              href="/operator/routes?tab=create"
              className="flex items-center gap-2 rounded-xl bg-[#b0d4ff] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0F172A] hover:brightness-110 transition"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              CREATE ROUTE
            </Link>
          </div>
        </div>

        {routes.isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#1e293b]/40 p-6">
                <div className="h-4 w-1/3 rounded bg-[#334155]" />
                <div className="mt-3 h-3 w-1/4 rounded bg-[#334155]" />
              </div>
            ))}
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#334155] bg-[#1e293b]/20 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#334155] block mb-4">alt_route</span>
            <p className="text-xl font-black text-[#F1F5F9] mb-2">No routes yet</p>
            <p className="text-sm text-[#64748b] mb-6">Create your first route to get started.</p>
            <Link
              href="/operator/routes?tab=create"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#5a52d9] transition"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Route
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-4 rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-5 hover:border-[#334155] transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6C63FF]/20 text-sm font-black text-[#6C63FF]">
                  {route.stop_count}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#F1F5F9]">{route.name}</p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {route.from_city} → {route.to_city} · {route.stop_count} stops
                    {route.created_by_name && <span> · Created by {route.created_by_name}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/operator/routes/${route.id}`}
                    className="rounded-lg bg-[#0B3C5D]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#a3cbf2] hover:bg-[#0B3C5D]/60 transition"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      const newName = prompt('Enter name for duplicated route:', `${route.name} (Copy)`);
                      if (newName?.trim()) {
                        duplicateRoute.mutate({ id: route.id, newName: newName.trim() });
                      }
                    }}
                    disabled={duplicateRoute.isPending}
                    className="rounded-lg bg-[#1e293b] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#F1F5F9] transition disabled:opacity-60"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete route "${route.name}"? This cannot be undone.`)) {
                        deleteRoute.mutate(route.id);
                      }
                    }}
                    disabled={deleteRoute.isPending}
                    className="rounded-lg bg-[#93000a]/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#ffb4ab] hover:bg-[#93000a]/40 transition disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
