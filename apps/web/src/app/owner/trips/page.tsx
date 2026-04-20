'use client';
/**
 * Owner — Screen 3: All Trips
 * All trips across all operators in the agency.
 * Reuses TripTable shared component with showOperator=true.
 * Data: GET /api/owner/trips
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { TableSkeleton, PageHeader } from '@/components/ui';
import { TripTable, type TripRow } from '@/components/shared';

interface OwnerTripsResponse {
  data: TripRow[];
  meta: { page: number; page_size: number; total: number };
}

export default function OwnerTripsPage() {
  const [status, setStatus] = useState('');
  const [date, setDate]     = useState('');
  const [page, setPage]     = useState(1);

  const { data: res, isLoading } = useQuery<OwnerTripsResponse>({
    queryKey: ['owner-trips', status, date, page],
    queryFn:  () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (date)   params.set('date',   date);
      params.set('page', String(page));
      return get<OwnerTripsResponse>(`/api/owner/trips?${params}`);
    },
    refetchInterval: 30_000,
  });

  const trips = res?.data ?? [];
  const meta  = res?.meta;

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="All Trips" subtitle="Agency-wide trip monitoring" />
        <div className="flex items-center gap-2 text-sm text-[#8c9198]">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Owner view — all operators
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          {/* Status filter */}
          <div className="flex bg-[#181c20] rounded-xl overflow-hidden border border-[#42474e]/40">
            {(['', 'active', 'scheduled', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-4 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors ${
                  status === s
                    ? 'bg-[#c4c0ff] text-[#2000a4]'
                    : 'text-[#8c9198] hover:text-[#e0e2e8]'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="bg-[#181c20] border border-[#42474e]/40 rounded-xl px-4 py-2.5 text-sm text-[#e0e2e8] outline-none focus:border-[#c4c0ff] transition-colors"
          />
          {date && (
            <button
              onClick={() => { setDate(''); setPage(1); }}
              className="text-xs text-[#8c9198] hover:text-[#e0e2e8] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Clear date
            </button>
          )}

          {meta && (
            <span className="ml-auto text-xs text-[#8c9198] self-center">
              {meta.total} trip{meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        {isLoading
          ? <TableSkeleton rows={8} />
          : <TripTable trips={trips} basePath="/owner/trips" showOperator={true} />
        }

        {/* Pagination */}
        {meta && meta.total > meta.page_size && (
          <div className="flex justify-between items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-2 text-sm text-[#c4c0ff] disabled:opacity-30 hover:opacity-80"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Prev
            </button>
            <span className="text-xs text-[#8c9198]">
              Page {page} of {Math.ceil(meta.total / meta.page_size)}
            </span>
            <button
              disabled={page >= Math.ceil(meta.total / meta.page_size)}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-2 text-sm text-[#c4c0ff] disabled:opacity-30 hover:opacity-80"
            >
              Next
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
