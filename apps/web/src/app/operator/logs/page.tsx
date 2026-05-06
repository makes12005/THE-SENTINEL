'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { TableSkeleton, StatusBadge } from '@/components/ui';

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
  trip_name?: string;
  stop_name?: string;
}

interface LogResponse {
  data: LogEntry[];
  meta: { page: number; page_size: number; total: number };
}

type TabType = 'alerts' | 'activity';

const CHANNEL_ICON: Record<string, string> = {
  call: 'phone', sms: 'sms', whatsapp: 'chat', manual: 'person',
};

const STATUS_DOT: Record<string, string> = {
  sent: 'bg-green-400', failed: 'bg-[#ffb4ab]', pending: 'bg-[#8c9198]',
};

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-green-900/30 text-green-400 border-green-800/50',
  success: 'bg-green-900/30 text-green-400 border-green-800/50',
  failed: 'bg-[#93000a]/30 text-[#ffb4ab] border-[#93000a]/50',
  pending: 'bg-[#1c2024] text-[#8c9198] border-[#42474e]/50',
};

export default function LogsPage() {
  const [tab, setTab] = useState<TabType>('alerts');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');

  const { data: resp, isLoading } = useQuery<LogResponse>({
    queryKey: ['alert-logs', page, dateFrom, dateTo, channel, status],
    queryFn: async () => {
      const params: Record<string, unknown> = { page };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (channel) params.channel = channel;
      if (status) params.status = status === 'success' ? 'sent' : status;
      return get<LogResponse>('/api/logs/alert-logs', params);
    },
  });
  const maskPhone = (phone: string) => (phone?.length > 8 ? `${phone.slice(0, 3)}XXXXX${phone.slice(-5)}` : phone);

  const logs = resp?.data ?? [];
  const total = resp?.meta?.total ?? 0;
  const pages = Math.ceil(total / 50);

  // Group logs by date for activity view
  const grouped = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    const day = new Date(log.attempted_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="bg-[#101418] min-h-screen text-[#e0e3e8] pb-12">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#a3cbf2]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-20 border-b border-[#ffffff08] bg-[#101418]/95 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-[#cee5ff] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>SYSTEM LOGS</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198] mt-0.5">OPERATIONAL OVERSIGHT // ALL SECTORS</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/20 border border-green-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-400">Fully Operational</span>
          </div>
        </div>
      </header>

      <div className="px-8 pt-8 max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#181c20] border border-[#42474e]/20 rounded-xl p-5 relative overflow-hidden group">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Total Logs</p>
            <p className="font-mono text-3xl font-bold text-[#a3cbf2] mt-1">{total.toLocaleString()}</p>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-[#1c2024] group-hover:text-[#a3cbf2]/10 transition-colors">analytics</span>
          </div>
          <div className="bg-[#181c20] border border-[#42474e]/20 rounded-xl p-5 relative overflow-hidden group">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">Failed Alerts</p>
            <p className="font-mono text-3xl font-bold text-[#ffb68b] mt-1">{failedCount}</p>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-[#1c2024] group-hover:text-[#ffb68b]/10 transition-colors">warning</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#42474e]/30">
          {([
            { key: 'alerts', label: 'Alert Logs', icon: 'notifications' },
            { key: 'activity', label: 'Activity Stream', icon: 'list_alt' },
          ] as { key: TabType; label: string; icon: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.15em] border-b-2 transition-all ${tab === t.key
                ? 'text-[#a3cbf2] border-[#a3cbf2]'
                : 'text-[#8c9198] border-transparent hover:text-[#c2c7ce]'}`}>
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-[#1c2024]/50 border border-[#42474e]/30 p-4 rounded-xl">
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-2.5 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-2.5 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors" />
          <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-2.5 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors">
            <option value="">All Channels</option>
            <option value="call">Call</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Manual</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-[#0b0f12] border border-[#42474e]/60 rounded-lg px-4 py-2.5 text-[#e0e3e8] text-sm focus:outline-none focus:border-[#a3cbf2]/50 transition-colors">
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          {(dateFrom || dateTo || channel || status) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setChannel(''); setStatus(''); setPage(1); }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2c7ce] bg-[#262a2f] hover:bg-[#31353a] border border-[#42474e]/50 transition-all">
              Clear
            </button>
          )}
        </div>

        {/* Alert Logs table */}
        {tab === 'alerts' && (
          <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 overflow-hidden">
            {isLoading ? <div className="p-6"><TableSkeleton rows={8} /></div> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#42474e]/50 bg-[#1c2024]/50 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">
                        <th className="px-6 py-4 font-normal">Passenger</th>
                        <th className="px-6 py-4 font-normal">Phone</th>
                        <th className="px-6 py-4 font-normal">Trip</th>
                        <th className="px-6 py-4 font-normal">Stop</th>
                        <th className="px-6 py-4 font-normal">Channel</th>
                        <th className="px-6 py-4 font-normal">Status</th>
                        <th className="px-6 py-4 font-normal">Error / Code</th>
                        <th className="px-6 py-4 font-normal">Time (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#42474e]/20">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#1c2024] transition-colors">
                          <td className="px-6 py-4 font-bold text-sm text-[#e0e3e8]">{log.passenger_name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-[#c2c7ce]">{maskPhone(log.passenger_phone)}</td>
                          <td className="px-6 py-4 text-xs text-[#c2c7ce]">{log.trip_name ?? log.trip_id.slice(0, 8)}</td>
                          <td className="px-6 py-4 text-xs text-[#c2c7ce]">{log.stop_name ?? '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c2c7ce]">
                              <span className="material-symbols-outlined text-[14px]">{CHANNEL_ICON[log.channel] ?? 'notifications'}</span>
                              {log.channel}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-[0.15em] ${STATUS_BADGE[log.status === 'success' ? 'sent' : log.status] ?? STATUS_BADGE.pending}`}>
                              {log.status === 'success' ? 'sent' : log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#ffb4ab] max-w-[180px] truncate">
                            {log.error_message ?? (log.response_code ? `Code ${log.response_code}` : '—')}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-[#c2c7ce]">
                            {new Date(log.attempted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr><td colSpan={8} className="px-6 py-12 text-center text-[#8c9198] text-sm">No alert logs match your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-[#42474e]/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198]">Page {page} of {pages} — {total} records</p>
                    <div className="flex gap-2">
                      <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-[#c2c7ce] bg-[#1c2024] hover:bg-[#262a2f] border border-[#42474e]/50 disabled:opacity-30 transition-all">←</button>
                      <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-[#c2c7ce] bg-[#1c2024] hover:bg-[#262a2f] border border-[#42474e]/50 disabled:opacity-30 transition-all">→</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Activity timeline */}
        {tab === 'activity' && (
          <div className="space-y-12 pb-8">
            {isLoading ? <div className="bg-[#181c20] rounded-xl border border-[#42474e]/20 p-6"><TableSkeleton rows={5} /></div>
              : Object.entries(grouped).length === 0 ? (
                <div className="text-center py-16 text-[#8c9198] text-sm">No activity logs found.</div>
              )
              : Object.entries(grouped).map(([day, entries]) => (
                <div key={day}>
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#e0e3e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>{day === new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) ? 'Today' : day}</h3>
                    <div className="h-px flex-1 bg-[#42474e]/30" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9198]">{entries.length} events</span>
                  </div>
                  <div className="relative space-y-4 ml-2">
                    <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[#42474e]/20" />
                    {entries.map((log) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-0 top-3 w-6 h-6 bg-[#181c20] border border-[#42474e]/50 rounded-full flex items-center justify-center z-10">
                          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[log.status] ?? STATUS_DOT.pending}`} />
                        </div>
                        <div className={`bg-[#181c20] border border-[#42474e]/20 ${log.status === 'failed' ? 'border-l-2 border-l-[#ffb4ab]' : log.status === 'sent' ? 'border-l-2 border-l-green-500' : ''} rounded-lg p-4 transition-colors hover:bg-[#1c2024]`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-bold text-[#e0e3e8] uppercase tracking-tight">
                                Alert {log.status === 'sent' ? 'Delivered' : log.status === 'failed' ? 'Failed' : 'Pending'}: {log.passenger_name}
                              </h4>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c9198] mt-0.5">
                                Channel: {log.channel.toUpperCase()} · Phone: {log.passenger_phone}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 border rounded ${STATUS_BADGE[log.status] ?? STATUS_BADGE.pending}`}>
                                {log.status}
                              </span>
                              <span className="font-mono text-[10px] text-[#8c9198]">
                                {new Date(log.attempted_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          {log.error_message && (
                            <p className="text-xs text-[#ffb4ab] mt-1">{log.error_message}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
