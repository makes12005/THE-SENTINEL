'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

const ALL_LOG_TYPES = [
  'TRIP_CREATED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED', 'TRIP_EXPIRED',
  'PASSENGER_UPLOADED', 'ALERT_SENT', 'ALERT_FAILED',
  'CONDUCTOR_OFFLINE', 'CONDUCTOR_ONLINE', 'DRIVER_TAKEOVER',
  'USER_LOGIN', 'USER_LOGOUT',
  'ROUTE_CREATED', 'TEMPLATE_CREATED',
  'WALLET_TOPUP', 'MEMBER_ADDED', 'MEMBER_DEACTIVATED',
  'TRIP_REASSIGNED', 'MONTHLY_TRIP_RESET',
];

interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_role: string | null;
}

const ACTION_COLOR: Record<string, string> = {
  TRIP_CREATED: 'text-blue-400 bg-blue-900/20 border-blue-800/40',
  TRIP_STARTED: 'text-green-400 bg-green-900/20 border-green-800/40',
  TRIP_COMPLETED: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40',
  TRIP_CANCELLED: 'text-red-400 bg-red-900/20 border-red-800/40',
  TRIP_EXPIRED: 'text-orange-400 bg-orange-900/20 border-orange-800/40',
  ALERT_SENT: 'text-green-400 bg-green-900/20 border-green-800/40',
  ALERT_FAILED: 'text-red-400 bg-red-900/20 border-red-800/40',
  CONDUCTOR_OFFLINE: 'text-orange-400 bg-orange-900/20 border-orange-800/40',
  WALLET_TOPUP: 'text-purple-400 bg-purple-900/20 border-purple-800/40',
  MEMBER_ADDED: 'text-cyan-400 bg-cyan-900/20 border-cyan-800/40',
  MEMBER_DEACTIVATED: 'text-red-400 bg-red-900/20 border-red-800/40',
};

function getActionColor(action: string) {
  return ACTION_COLOR[action] ?? 'text-[#94a3b8] bg-[#1e293b]/60 border-[#1e293b]';
}

export default function OwnerLogsPage() {
  const [actionType, setActionType] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    if (actionType) p.set('action_type', actionType);
    if (date) p.set('date', date);
    if (search.trim()) p.set('search', search.trim());
    return `?${p.toString()}`;
  }, [actionType, date, search, page]);

  const { data, isLoading, isError } = useQuery<{ data: AuditLogRow[]; meta: { total: number; page: number; page_size: number } }>({
    queryKey: ['owner-audit-logs', qs],
    queryFn: () => get(`/api/owner/logs${qs}`),
    refetchInterval: 30000,
  });

  const logs = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const meta = (data as any)?.meta ?? { total: 0, page: 1, page_size: 50 };
  const totalPages = Math.ceil((meta.total || 0) / (meta.page_size || 50));

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-6">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#475569]">Agency Audit Trail</p>
          <h1 className="text-base font-black text-[#F1F5F9]">GLOBAL LOGS</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#7dffd4] animate-pulse" />
          <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">{meta.total} Records</span>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Log Type</label>
            <select
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#6C63FF]/50"
            >
              <option value="">All Types</option>
              {ALL_LOG_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-2.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#6C63FF]/50 [color-scheme:dark]"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">Search (action or actor name)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] text-[16px]">search</span>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search logs..."
                className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 pl-9 pr-4 py-2.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#6C63FF]/50"
              />
            </div>
          </div>
        </div>

        {/* Clear button */}
        {(actionType || date || search) && (
          <button
            onClick={() => { setActionType(''); setDate(''); setSearch(''); setPage(1); }}
            className="text-[0.625rem] font-bold uppercase tracking-widest text-[#475569] hover:text-[#F1F5F9] transition-colors"
          >
            ✕ Clear filters
          </button>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[#1e293b]/50 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-[#ffb4ab]">Failed to load logs.</p>
        ) : (
          <div className="rounded-xl border border-[#1e293b] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e293b] bg-[#1e293b]/50 text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">
                  <th className="px-5 py-3 font-normal">Action</th>
                  <th className="px-5 py-3 font-normal">Entity</th>
                  <th className="px-5 py-3 font-normal">Actor</th>
                  <th className="px-5 py-3 font-normal">Time (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {logs.map((log: AuditLogRow) => (
                  <tr key={log.id} className="hover:bg-[#1e293b]/40 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[0.5625rem] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#94a3b8]">
                      <span className="font-bold text-[#F1F5F9]">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="ml-2 font-mono text-[0.5625rem] text-[#475569]">
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#94a3b8]">
                      {log.actor_name ? (
                        <div>
                          <p className="font-bold text-[#F1F5F9]">{log.actor_name}</p>
                          <p className="text-[0.5625rem] text-[#475569] uppercase">{log.actor_role}</p>
                        </div>
                      ) : (
                        <span className="text-[#475569]">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[#94a3b8]">
                      {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-[#475569] text-sm">
                      No logs found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e293b]">
                <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569]">
                  Page {page} of {totalPages} — {meta.total} records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#94a3b8] bg-[#1e293b] hover:bg-[#283548] border border-[#1e293b] disabled:opacity-30 transition-all"
                  >←</button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#94a3b8] bg-[#1e293b] hover:bg-[#283548] border border-[#1e293b] disabled:opacity-30 transition-all"
                  >→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
