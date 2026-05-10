'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

type LibraryEntry = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  captured_by_name: string;
  agency_name: string;
  use_count: number;
  verified: boolean;
  created_at: string;
};

export default function GeoLibraryPage() {
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const query = useQuery<LibraryEntry[]>({
    queryKey: ['geo-library', search],
    queryFn: () => get('/api/geo-library', search ? { search, limit: 100 } : { limit: 100 }),
  });

  const rows = useMemo(() => {
    return (query.data ?? []).filter((row) => {
      if (agencyFilter && row.agency_name !== agencyFilter) return false;
      if (verifiedFilter === 'verified' && !row.verified) return false;
      if (verifiedFilter === 'unverified' && row.verified) return false;
      if (dateFilter && !row.created_at.startsWith(dateFilter)) return false;
      return true;
    });
  }, [agencyFilter, dateFilter, query.data, verifiedFilter]);

  const agencies = Array.from(new Set((query.data ?? []).map((row) => row.agency_name))).sort();

  return (
    <div className="min-h-screen bg-[#f4f8fb] px-6 py-8 text-[#102132]">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#0f9ae8]">Operator Shared Data</p>
          <h1 className="mt-2 text-4xl font-black">Geo Library</h1>
          <p className="mt-2 text-sm text-[#526579]">
            Saved field coordinates from conductors and drivers. Any operator can reuse these points while building routes.
          </p>
        </div>

        <div className="grid gap-4 rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(9,33,56,0.08)] md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by stop or village name"
            className="rounded-[20px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-3 text-sm font-semibold outline-none"
          />
          <select
            value={agencyFilter}
            onChange={(event) => setAgencyFilter(event.target.value)}
            className="rounded-[20px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-3 text-sm font-semibold outline-none"
          >
            <option value="">All agencies</option>
            {agencies.map((agency) => (
              <option key={agency} value={agency}>{agency}</option>
            ))}
          </select>
          <select
            value={verifiedFilter}
            onChange={(event) => setVerifiedFilter(event.target.value as typeof verifiedFilter)}
            className="rounded-[20px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-3 text-sm font-semibold outline-none"
          >
            <option value="all">All verification states</option>
            <option value="verified">Verified only</option>
            <option value="unverified">Unverified only</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-[20px] border border-[#d8e5f1] bg-[#f7fbff] px-4 py-3 text-sm font-semibold outline-none"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(9,33,56,0.08)]">
          <table className="w-full border-collapse">
            <thead className="bg-[#f7fbff]">
              <tr className="text-left text-xs font-black uppercase tracking-[0.16em] text-[#526579]">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Lat</th>
                <th className="px-5 py-4">Lng</th>
                <th className="px-5 py-4">Captured by</th>
                <th className="px-5 py-4">Agency</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#edf3f8] text-sm">
                  <td className="px-5 py-4 font-black">{row.name}</td>
                  <td className="px-5 py-4 font-mono">{row.latitude.toFixed(6)}</td>
                  <td className="px-5 py-4 font-mono">{row.longitude.toFixed(6)}</td>
                  <td className="px-5 py-4">{row.captured_by_name}</td>
                  <td className="px-5 py-4">{row.agency_name}</td>
                  <td className="px-5 py-4">{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4">{row.use_count} times</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm font-semibold text-[#526579]">
                    No coordinates matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
