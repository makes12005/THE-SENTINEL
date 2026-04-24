'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Clock, MemoryStick, Bus, Bell } from 'lucide-react';

interface HealthData {
  db_status: string;
  total_agencies: number;
  total_users: number;
  total_trips: number;
  active_trips: number;
  alerts_sent_today: number;
  uptime_seconds: number;
  memory_mb: number;
  node_version: string;
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 14, color: '#9ca3af' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {ok
          ? <CheckCircle2 size={14} color="#22c55e" />
          : <AlertTriangle size={14} color="#ef4444" />}
        <span style={{ fontSize: 14, fontWeight: 700, color: ok ? '#e5e7eb' : '#ef4444' }}>{value}</span>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit, color = '#6b7280' }: {
  icon: any; label: string; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '22px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</span>
        <div style={{ padding: 7, borderRadius: 8, background: `${color}15` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#f3f4f6' }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>{unit}</span>}
      </div>
    </div>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export default function AdminHealthPage() {
  const [data, setData]     = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    setLoading(true);
    get<{ data: HealthData }>('/api/admin/health')
      .then((r) => { setData(r.data); setLastRefresh(new Date()); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const allOk = data?.db_status === 'ok' && (data?.memory_mb ?? 0) < 512;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>System Health</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
            Last refreshed: {lastRefresh.toLocaleTimeString('en-IN')} · Auto-refreshes every 30s
          </p>
        </div>
        <button id="refresh-health-btn" onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9,
          border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
          color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Overall status banner */}
      {!loading && data && (
        <div style={{
          background: allOk ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${allOk ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {allOk
            ? <CheckCircle2 size={18} color="#22c55e" />
            : <AlertTriangle size={18} color="#ef4444" />}
          <span style={{ fontWeight: 700, color: allOk ? '#22c55e' : '#ef4444', fontSize: 15 }}>
            {allOk ? 'All systems operational' : 'Attention required'}
          </span>
          <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 4 }}>
            Bus Alert Platform · Node {data.node_version}
          </span>
        </div>
      )}

      {/* Metric grid */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <Metric icon={Clock}       label="Uptime"          value={formatUptime(data.uptime_seconds)}  color="#a78bfa" />
          <Metric icon={MemoryStick} label="Memory (Heap)"   value={data.memory_mb}  unit="MB"          color={data.memory_mb > 512 ? '#ef4444' : '#22c55e'} />
          <Metric icon={Activity}    label="Active Trips"     value={data.active_trips}                  color="#f59e0b" />
          <Metric icon={Bell}        label="Alerts Today"     value={data.alerts_sent_today}             color="#3b82f6" />
          <Metric icon={Bus}         label="Total Trips (All)" value={data.total_trips.toLocaleString()} color="#06b6d4" />
          <Metric icon={Cpu}         label="Total Users"      value={data.total_users}                   color="#8b5cf6" />
        </div>
      )}

      {/* Checklist */}
      {!loading && data && (
        <div style={{
          background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '24px 28px',
        }}>
          <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="#ef4444" /> Service Checks
          </div>
          <Row label="PostgreSQL Database"   value={data.db_status === 'ok' ? 'Connected' : 'Error'} ok={data.db_status === 'ok'} />
          <Row label="Node.js Runtime"       value={data.node_version}                                ok={true} />
          <Row label="Heap Memory"           value={`${data.memory_mb} MB`}                           ok={data.memory_mb < 512} />
          <Row label="Total Agencies"        value={data.total_agencies.toString()}                   ok={true} />
          <Row label="Active Trips (Live)"   value={data.active_trips.toString()}                     ok={true} />
          <Row label="Alerts Sent Today"     value={data.alerts_sent_today.toString()}                ok={true} />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 80 }}>Fetching system status…</div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
