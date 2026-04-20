'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { TableSkeleton, PageHeader, StatusBadge } from '@/components/ui';

interface LogEntry {
  id: string;
  channel: string;
  status: string;
  attempted_at: string;
  response_code: string | null;
  error_message: string | null;
  passenger_name: string;
  passenger_phone: string;
  trip_id: string;
}

interface LogResponse {
  data: LogEntry[];
  meta: { page: number; page_size: number; total: number };
}

export default function LogsPage() {
  const [page,    setPage]    = useState(1);
  const [date,    setDate]    = useState('');
  const [channel, setChannel] = useState('');
  const [status,  setStatus]  = useState('');

  const { data: resp, isLoading } = useQuery<LogResponse>({
    queryKey: ['alert-logs', page, date, channel, status],
    queryFn: async () => {
      const params: Record<string, unknown> = { page };
      if (date)    params.date    = date;
      if (channel) params.channel = channel;
      if (status)  params.status  = status;
      const meta = await get<LogResponse>('/api/logs/alert-logs');
      return meta;
    },
  });

  const logs  = resp?.data ?? [];
  const total = resp?.meta?.total ?? 0;
  const pages = Math.ceil(total / 50);

  const CHANNEL_ICON: Record<string, string> = {
    call:     'phone',
    sms:      'sms',
    whatsapp: 'chat',
    manual:   'person',
  };

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center gap-4 px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Alert Logs" subtitle={`${total} Records`} />
      </header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-2.5 text-[#e0e2e8] text-sm focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
          />
          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-2.5 text-[#e0e2e8] text-sm focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 transition-all"
          >
            <option value="">All Channels</option>
            <option value="call">Call</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-2.5 text-[#e0e2e8] text-sm focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          {(date || channel || status) && (
            <button
              onClick={() => { setDate(''); setChannel(''); setStatus(''); setPage(1); }}
              className="px-4 py-2.5 rounded-xl text-sm text-[#c2c7ce] opacity-60 hover:opacity-100 bg-[#31353a] hover:bg-[#42474e] transition-all"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce]/60">
                    <th className="px-6 pb-2">Passenger</th>
                    <th className="px-6 pb-2">Phone</th>
                    <th className="px-6 pb-2">Channel</th>
                    <th className="px-6 pb-2">Status</th>
                    <th className="px-6 pb-2">Error</th>
                    <th className="px-6 pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="bg-[#181c20] hover:bg-[#1c2024] transition-colors">
                      <td className="px-6 py-4 rounded-l-xl font-bold text-[#e0e2e8] text-sm">{log.passenger_name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-[#c2c7ce]">{log.passenger_phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#c2c7ce]">
                          <span className="material-symbols-outlined text-[16px]">
                            {CHANNEL_ICON[log.channel] ?? 'notifications'}
                          </span>
                          {log.channel}
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={log.status} /></td>
                      <td className="px-6 py-4 text-xs text-[#ffb4ab] max-w-[180px] truncate">
                        {log.error_message ?? (log.response_code ? `Code ${log.response_code}` : '—')}
                      </td>
                      <td className="px-6 py-4 rounded-r-xl text-xs font-mono text-[#8c9198]">
                        {new Date(log.attempted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[#8c9198] text-sm rounded-xl bg-[#181c20]">
                        No alert logs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-[#8c9198]">
                  Page {page} of {pages} — {total} records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] disabled:opacity-30 transition-all"
                  >
                    ←
                  </button>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-[#c2c7ce] bg-[#31353a] hover:bg-[#42474e] disabled:opacity-30 transition-all"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
