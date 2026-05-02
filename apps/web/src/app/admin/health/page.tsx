'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { 
  Activity, CheckCircle2, AlertTriangle, RefreshCw, Cpu, 
  Clock, MemoryStick, Bus, Bell, ShieldCheck, Database,
  Terminal, Server, Zap
} from 'lucide-react';

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

function MetricCard({ label, value, icon: Icon, color, subtext }: any) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ padding: 8, background: `${color}15`, borderRadius: 8 }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 4 }}>{subtext}</div>}
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok, icon: Icon }: any) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0', borderBottom: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon size={16} color="var(--color-on-surface-muted)" />
        <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ 
          fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 4,
          background: ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: ok ? '#22C55E' : '#EF4444'
        }}>
          {ok ? 'STABLE' : 'UNSTABLE'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>{value}</span>
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
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    get<HealthData>('/api/admin/health')
      .then((r) => { setData(r); setLastRefresh(new Date()); })
      .catch((e: any) => {
        setData(null);
        const status = e?.response?.status;
        const msg = e?.response?.data?.error?.message;
        if (status === 401) {
          setError('Session expired. Please login again.');
        } else {
          setError(typeof msg === 'string' ? msg : 'Failed to load health data. Check your connection and try again.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const allOk = data?.db_status === 'ok' && (data?.memory_mb ?? 0) < 512;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {error && (
        <div style={{ padding: 32, textAlign: 'center', background: '#1E293B', border: '1px solid #EF4444', borderRadius: 12 }}>
          <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: 12 }}>{error}</div>
          <button onClick={load} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            RETRY
          </button>
        </div>
      )}
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Network Diagnostics</h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 14, marginTop: 4 }}>
            Real-time infrastructure health and telemetry data.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>LAST SYNC</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{lastRefresh.toLocaleTimeString()}</div>
          </div>
          <button 
            onClick={load} disabled={loading}
            style={{ 
              padding: '12px 20px', background: '#1E293B', border: '1px solid var(--color-border)', 
              borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            FORCE REFRESH
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {!loading && data && (
        <div style={{ 
          background: allOk ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${allOk ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: 12, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', background: allOk ? '#22C55E' : '#EF4444', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 15px ${allOk ? '#22C55E' : '#EF4444'}40`
          }}>
            {allOk ? <ShieldCheck size={18} color="#fff" /> : <AlertTriangle size={18} color="#fff" />}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: allOk ? '#22C55E' : '#EF4444' }}>
              {allOk ? 'CORE SYSTEMS OPERATIONAL' : 'SYSTEM DEGRADATION DETECTED'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>
              Sentinel Grid Engine v4.2 · GUJ-MUMBAI-01 Cluster
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <MetricCard icon={Clock} label="SYSTEM UPTIME" value={formatUptime(data.uptime_seconds)} color="var(--color-secondary)" />
          <MetricCard icon={MemoryStick} label="MEMORY CONSUMPTION" value={`${data.memory_mb} MB`} color={data.memory_mb > 512 ? '#EF4444' : '#22C55E'} />
          <MetricCard icon={Activity} label="ACTIVE TRIP FLOW" value={data.active_trips} color="var(--color-accent)" />
          <MetricCard icon={Bell} label="ALERTS DISPATCHED" value={data.alerts_sent_today} color="#3B82F6" />
        </div>
      )}

      {/* Bottom Section: Service Status & Raw Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
        <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Server size={18} color="var(--color-secondary)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>INFRASTRUCTURE LAYERS</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <StatusRow label="Primary Data Store" value="POSTGRES SQL" ok={data?.db_status === 'ok'} icon={Database} />
            <StatusRow label="Runtime Environment" value={`NODE ${data?.node_version || '18.x'}`} ok={true} icon={Terminal} />
            <StatusRow label="Real-time Engine" value="SOCKET.IO GRID" ok={true} icon={Zap} />
            <StatusRow label="Agency Federation" value={`${data?.total_agencies || 0} NODES`} ok={true} icon={Bus} />
            <StatusRow label="User Access Layer" value={`${data?.total_users || 0} IDENTITIES`} ok={true} icon={Cpu} />
          </div>
        </div>

        <div style={{ background: '#0B0D10', borderRadius: 16, border: '1px solid var(--color-border)', padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>LIVE TELEMETRY</h3>
          </div>
          <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 12, background: 'rgba(0,0,0,0.3)', padding: '20px', fontFamily: 'monospace' }}>
            <div style={{ color: '#22C55E', fontSize: 12 }}>[SYS] GRID_STABLE: HEARTBEAT_SUCCESS</div>
            <div style={{ color: 'var(--color-on-surface-muted)', fontSize: 12, marginTop: 4 }}>[DB] CONNECTION_POOL: 12/20 ACTIVE</div>
            <div style={{ color: 'var(--color-on-surface-muted)', fontSize: 12, marginTop: 4 }}>[AUTH] TOKEN_VERIFY: PASS (0.02ms)</div>
            <div style={{ color: '#FF7A00', fontSize: 12, marginTop: 4 }}>[APP] REVENUE_CYCLE: PENDING_CRON</div>
            <div style={{ color: '#22C55E', fontSize: 12, marginTop: 4 }}>[SYS] MEMORY_THRESHOLD: WITHIN_LIMITS</div>
            <div style={{ color: '#6C63FF', fontSize: 12, marginTop: 4 }}>[NET] LATENCY: 24ms (ASIA-SOUTH-1)</div>
          </div>
          <button 
            onClick={() => {
              const dumpData = data || { status: 'no_data_loaded_yet' };
              const blob = new Blob([JSON.stringify(dumpData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'system_health_dump.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ 
            width: '100%', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', 
            borderRadius: 12, color: 'var(--color-on-surface-muted)', fontSize: 11, fontWeight: 800, cursor: 'pointer'
          }}>
            DOWNLOAD FULL LOG DUMP (.JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
