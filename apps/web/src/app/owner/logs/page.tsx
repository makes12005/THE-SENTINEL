'use client';
/**
 * Owner — Screen 4: Global Alert Logs
 * All alert logs across the entire agency.
 * Reuses LogsTable shared component with showOperator=true.
 * Data: GET /api/owner/logs
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { TableSkeleton, PageHeader } from '@/components/ui';
import { LogsTable, type LogRow } from '@/components/shared';

interface LogsResponse {
  data: LogRow[];
  meta: { page: number; page_size: number; total: number };
}

const CHANNELS = ['', 'call', 'sms', 'whatsapp', 'manual'] as const;
const STATUSES  = ['', 'success', 'failed'] as const;

export default function OwnerLogsPage() {
  const [channel, setChannel] = useState('');
  const [status,  setStatus]  = useState('');
  const [date,    setDate]    = useState('');
  const [page,    setPage]    = useState(1);

  const { data: res, isLoading } = useQuery<LogsResponse>({
    queryKey: ['owner-logs', channel, status, date, page],
    queryFn:  () => {
      const params = new URLSearchParams();
      if (channel) params.set('channel', channel);
      if (status)  params.set('status',  status);
      if (date)    params.set('date',    date);
      params.set('page', String(page));
      return get<LogsResponse>(`/api/owner/logs?${params}`);
    },
    refetchInterval: 30_000,
  });

  const logs = res?.data ?? [];
  const meta = res?.meta;

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Alert Logs" subtitle="Agency-wide delivery history" />
        {meta && (
          <span className="text-xs text-[#8c9198]">{meta.total} records</span>
        )}
      </header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* Channel */}
          <div className="flex bg-[#181c20] rounded-xl overflow-hidden border border-[#42474e]/40">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => { setChannel(c); setPage(1); }}
                className={`px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors ${
                  channel === c
                    ? 'bg-[#c4c0ff] text-[#2000a4]'
                    : 'text-[#8c9198] hover:text-[#e0e2e8]'
                }`}
              >
                {c || 'All'}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex bg-[#181c20] rounded-xl overflow-hidden border border-[#42474e]/40">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors ${
                  status === s
                    ? 'bg-[#c4c0ff] text-[#2000a4]'
                    : 'text-[#8c9198] hover:text-[#e0e2e8]'
                }`}
              >
                {s || 'All Status'}
              </button>
            ))}
          </div>

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="bg-[#181c20] border border-[#42474e]/40 rounded-xl px-4 py-2.5 text-sm text-[#e0e2e8] outline-none focus:border-[#c4c0ff] transition-colors"
          />
          {date && (
            <button onClick={() => { setDate(''); setPage(1); }} className="text-xs text-[#8c9198] hover:text-[#e0e2e8]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading
          ? <TableSkeleton rows={8} />
          : <LogsTable logs={logs} showOperator={true} />
        }

        {/* Pagination */}
        {meta && meta.total > meta.page_size && (
          <div className="flex justify-between items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-2 text-sm text-[#c4c0ff] disabled:opacity-30 hover:opacity-80"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Prev
            </button>
            <span className="text-xs text-[#8c9198]">
              Page {page} of {Math.ceil(meta.total / meta.page_size)}
            </span>
            <button
              disabled={page >= Math.ceil(meta.total / meta.page_size)}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-2 text-sm text-[#c4c0ff] disabled:opacity-30 hover:opacity-80"
            >
              Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
