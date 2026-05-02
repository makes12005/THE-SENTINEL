'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Filter, AlertCircle, CheckCircle2, Info, 
  Clock, Loader2, Activity, RefreshCw, Download
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: string;
  actor_name: string;
}

const STATUS_MAP: Record<string, { color: string; label: string; icon: any }> = {
  CREATE_AGENCY: { color: '#3B82F6', label: 'INFO', icon: Info },
  ACTIVATE_AGENCY: { color: '#22C55E', label: 'SUCCESS', icon: CheckCircle2 },
  DEACTIVATE_AGENCY: { color: '#EF4444', label: 'ERROR', icon: AlertCircle },
  TOPUP_AGENCY: { color: '#22C55E', label: 'SUCCESS', icon: CheckCircle2 },
  UPDATE_BILLING_CONFIG: { color: '#F59E0B', label: 'WARN', icon: Clock },
};

function ActivityItem({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  const status = STATUS_MAP[log.action] || { color: '#94A3B8', label: 'INFO', icon: Info };
  const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: 8, height: 8, borderRadius: '50%', background: status.color, 
          boxShadow: `0 0 8px ${status.color}`, zIndex: 1, marginTop: 10
        }} />
        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.05)', marginTop: 4 }} />
      </div>
      <button
        type="button"
        onClick={onToggle}
        style={{ 
        flex: 1, background: '#1E293B', borderRadius: 8, padding: '16px', 
        border: '1px solid var(--color-border)', marginBottom: 12,
        textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ 
            fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, 
            background: `${status.color}15`, color: status.color, letterSpacing: '0.05em'
          }}>
            {status.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontWeight: 600 }}>{time} UTC</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{log.action.replace(/_/g, ' ')}</div>
        <div style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', marginTop: 4 }}>
          {log.actor_name} • {log.entity_type} {log.entity_id?.slice(0, 8)}
        </div>
        {expanded && (
          <pre style={{
            marginTop: 12,
            padding: 12,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            fontSize: 11,
            overflow: 'auto',
            maxHeight: 200,
            color: 'var(--color-on-surface-muted)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {log.metadata != null ? JSON.stringify(log.metadata, null, 2) : '—'}
          </pre>
        )}
      </button>
    </div>
  );
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<AuditLog[]>('/api/admin/audit-logs');
      setLogs(data);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 401 ? 'Session expired. Please login again.' : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredLogs = logs
    .filter((log) => (actionFilter === 'ALL' ? true : log.action === actionFilter))
    .filter((log) => {
      const t = new Date(log.created_at).getTime();
      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        if (t < start.getTime()) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (t > end.getTime()) return false;
      }
      return true;
    })
    .filter((log) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor_name.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        (log.entity_id ?? '').toLowerCase().includes(q)
      );
    });

  const exportCsv = () => {
    const rows = filteredLogs;
    const header = ['created_at', 'action', 'actor_name', 'entity_type', 'entity_id', 'ip_address'];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        header
          .map((h) => esc(String((r as unknown as Record<string, unknown>)[h] ?? '')))
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV export downloaded.');
  };

  const actionOptions = ['ALL', ...Array.from(new Set(logs.map((l) => l.action)))].slice(0, 12);
  const errorCount = logs.filter((log) => STATUS_MAP[log.action]?.label === 'ERROR').length;
  const warnCount = logs.filter((log) => STATUS_MAP[log.action]?.label === 'WARN').length;

  useEffect(() => {
    setVisibleCount(20);
  }, [query, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Global Logs</h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 14, marginTop: 4 }}>
            Platform-wide audit trail from deployed backend.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => exportCsv()}
            disabled={loading || filteredLogs.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: '#1E293B',
              color: '#fff',
              fontWeight: 700,
              cursor: loading || filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredLogs.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: '#1E293B',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <div style={{ background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontWeight: 700 }}>TOTAL EVENTS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4 }}>{logs.length}</div>
        </div>
        <div style={{ background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontWeight: 700 }}>ERROR EVENTS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginTop: 4 }}>{errorCount}</div>
        </div>
        <div style={{ background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontWeight: 700 }}>WARN EVENTS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>{warnCount}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor, action, entity..."
          style={{
            flex: '1 1 200px',
            background: '#1E293B',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            minWidth: 160,
          }}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
          style={{
            background: '#1E293B',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '9px 12px',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
          style={{
            background: '#1E293B',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '9px 12px',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0 10px' }}>
          <Filter size={14} color="var(--color-on-surface-muted)" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, outline: 'none', height: 38 }}
          >
            {actionOptions.map((option) => (
              <option key={option} value={option} style={{ background: '#1E293B' }}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: '#0B0D10', borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={18} color="#6C63FF" />
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>GLOBAL ACTIVITY STREAM</h2>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 className="animate-spin" style={{ color: '#6C63FF', margin: '0 auto' }} />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: '#EF4444', fontWeight: 700, padding: 30 }}>{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-on-surface-muted)', fontWeight: 600, padding: 30 }}>No logs match current filters.</div>
          ) : (
            filteredLogs.slice(0, visibleCount).map((log) => (
              <ActivityItem
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId((id) => (id === log.id ? null : log.id))}
              />
            ))
          )}
          
          <button 
            onClick={() => setVisibleCount((count) => count + 20)}
            disabled={loading || visibleCount >= filteredLogs.length}
            style={{ 
            width: '100%', padding: '14px', background: 'rgba(255,255,255,0.02)', border: 'none', 
            borderRadius: 8, color: 'var(--color-on-surface-muted)', fontSize: 11, fontWeight: 800, 
            cursor: loading || visibleCount >= filteredLogs.length ? 'not-allowed' : 'pointer',
            opacity: loading || visibleCount >= filteredLogs.length ? 0.6 : 1,
            letterSpacing: '0.05em', marginTop: 12
          }}>
            {visibleCount >= filteredLogs.length ? 'ALL EVENTS LOADED' : 'LOAD OLDER EVENTS'}
          </button>
        </div>
      </div>
    </div>
  );
}
