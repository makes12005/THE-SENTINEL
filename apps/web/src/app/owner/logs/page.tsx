'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { LogsTable, type LogRow } from '@/components/shared';

export default function OwnerLogsPage() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [operator, setOperator] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (channel) p.set('channel', channel);
    if (status) p.set('status', status);
    if (date) p.set('date', date);
    if (operator.trim()) p.set('operator', operator.trim());
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [channel, status, date, operator]);

  const logs = useQuery<LogRow[]>({
    queryKey: ['owner-logs', qs],
    queryFn: () => get(`/api/owner/logs${qs}`),
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-6">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#475569]">Agency Alert Oversight</p>
          <h1 className="text-base font-black text-[#F1F5F9]">GLOBAL ALERT LOGS</h1>
        </div>
      </header>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            >
              <option value="">All</option>
              <option value="call">call</option>
              <option value="sms">sms</option>
              <option value="whatsapp">whatsapp</option>
              <option value="manual">manual</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            >
              <option value="">All</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
              <option value="pending">pending</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Operator</label>
            <input
              type="search"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="Operator name"
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9]"
            />
          </div>
        </div>

        {logs.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[#1e293b]/50 animate-pulse" />
            ))}
          </div>
        ) : logs.isError ? (
          <p className="text-sm text-[#ffb4ab]">Failed to load owner logs.</p>
        ) : (
          <LogsTable logs={logs.data ?? []} showOperator />
        )}
      </div>
    </div>
  );
}
