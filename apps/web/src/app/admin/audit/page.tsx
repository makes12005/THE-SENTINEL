'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { ScrollText, Search, Filter } from 'lucide-react';

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

const ACTION_COLORS: Record<string, string> = {
  CREATE_AGENCY:       '#22c55e',
  ACTIVATE_AGENCY:     '#22c55e',
  DEACTIVATE_AGENCY:   '#ef4444',
  TOPUP_AGENCY:        '#3b82f6',
  UPDATE_BILLING_CONFIG: '#f59e0b',
};

const CELL: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'top',
};
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, color: '#6b7280', fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase' as const, background: 'rgba(255,255,255,0.02)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

export default function AdminAuditPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [filtered, setFiltered] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog]   = useState<AuditLog | null>(null);

  const load = () => {
    setLoading(true);
    get<AuditLog[]>('/api/admin/audit-logs')
      .then((r) => { setLogs(r); setFiltered(r); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = logs;
    if (search) result = result.filter((l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_id ?? '').includes(search)
    );
    if (entityFilter) result = result.filter((l) => l.entity_type === entityFilter);
    setFiltered(result);
  }, [search, entityFilter, logs]);

  const entityTypes = [...new Set(logs.map((l) => l.entity_type))];

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Audit Logs</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
          Last 200 admin actions · {filtered.length} entries shown
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={13} color="#6b7280" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            id="audit-search"
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, entity ID…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px 9px 32px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={13} color="#6b7280" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <select
            id="audit-entity-filter"
            value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              padding: '9px 32px 9px 30px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
              background: '#16162a', color: '#e5e7eb', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All entities</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 340px' : '1fr', gap: 16 }}>
        {/* Table */}
        <div style={{
          background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Time', 'Actor', 'Action', 'Entity', 'IP', ''].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#4b5563', padding: 48 }}>No audit logs found</td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}>
                  <td style={CELL}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(log.created_at).toLocaleDateString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(log.created_at).toLocaleTimeString('en-IN')}</div>
                  </td>
                  <td style={{ ...CELL, fontWeight: 600, color: '#e5e7eb' }}>{log.actor_name}</td>
                  <td style={CELL}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: `${ACTION_COLORS[log.action] ?? '#6b7280'}18`,
                      color: ACTION_COLORS[log.action] ?? '#9ca3af',
                      letterSpacing: '0.03em',
                    }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={CELL}>
                    <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{log.entity_type}</div>
                    <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>{log.entity_id?.slice(0, 12)}{log.entity_id ? '…' : ''}</div>
                  </td>
                  <td style={{ ...CELL, fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>{log.ip_address ?? '—'}</td>
                  <td style={CELL}>
                    <button style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.08)',
                      background: selectedLog?.id === log.id ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
                      color: selectedLog?.id === log.id ? '#ef4444' : '#6b7280', cursor: 'pointer',
                    }}>
                      {selectedLog?.id === log.id ? 'Close' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selectedLog && (
          <div style={{
            background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '20px', alignSelf: 'start', position: 'sticky', top: 20,
          }}>
            <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScrollText size={14} color="#ef4444" />
              Log Detail
            </div>
            {[
              { label: 'Action',      value: selectedLog.action },
              { label: 'Actor',       value: selectedLog.actor_name },
              { label: 'Entity Type', value: selectedLog.entity_type },
              { label: 'Entity ID',   value: selectedLog.entity_id ?? '—' },
              { label: 'IP Address',  value: selectedLog.ip_address ?? '—' },
              { label: 'Time',        value: new Date(selectedLog.created_at).toLocaleString('en-IN') },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#e5e7eb', wordBreak: 'break-all' }}>{value}</div>
              </div>
            ))}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Metadata</div>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 12px',
                  fontSize: 11, color: '#9ca3af', overflowX: 'auto', margin: 0,
                }}>
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
