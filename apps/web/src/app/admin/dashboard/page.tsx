'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import {
  Building2, Users, Bus, Bell, CreditCard, Cpu,
  TrendingUp, AlertTriangle, CheckCircle2, Activity,
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

interface BillingSummary {
  total_trips_consumed: number;
  total_trips_credited: number;
  agency_count: number;
  low_trips_agencies: number;
  agency_wallets: {
    agency_id: string;
    agency_name: string;
    trips_remaining: number;
    trips_used_this_month: number;
    low_trips: boolean;
  }[];
}

function KpiCard({
  icon: Icon, label, value, sub, accent, warn
}: {
  icon: any; label: string; value: string | number; sub?: string; accent?: string; warn?: boolean;
}) {
  const color = warn ? '#ef4444' : (accent ?? '#ef4444');
  return (
    <div style={{
      background: 'linear-gradient(135deg, #13131f 0%, #16162a 100%)',
      border: `1px solid ${warn ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 14, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</span>
        <div style={{ padding: '6px', borderRadius: 8, background: `${color}18` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f3f4f6', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AdminDashboard() {
  const [health, setHealth]   = useState<HealthData | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<HealthData>('/api/admin/health'),
      get<BillingSummary>('/api/admin/wallet/summary'),
    ]).then(([h, b]) => {
      setHealth(h);
      setBilling(b);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f3f4f6', margin: 0, letterSpacing: '-0.01em' }}>
          Platform Admin
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>
          Platform-wide overview · Bus Alert Control Center
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 60 }}>Loading platform data…</div>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <KpiCard icon={Building2} label="Total Agencies"       value={health?.total_agencies ?? 0}     sub="on platform" />
            <KpiCard icon={Users}     label="Total Users"          value={health?.total_users ?? 0}        sub="all roles" />
            <KpiCard icon={Bus}       label="Active Trips"         value={health?.active_trips ?? 0}       sub="right now" accent="#22c55e" />
            <KpiCard icon={Bell}      label="Alerts Sent Today"    value={health?.alerts_sent_today ?? 0}  sub="via all channels" accent="#f59e0b" />
            <KpiCard icon={TrendingUp} label="Trips Credited" value={billing?.total_trips_credited ?? 0} sub="all agencies" />
            <KpiCard icon={AlertTriangle} label="Low Balance" value={billing?.low_trips_agencies ?? 0} sub="agencies at risk" warn={(billing?.low_trips_agencies ?? 0) > 0} />
          </div>

          {/* Two-column: System Health + Agency Balances */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
            {/* System Health Card */}
            <div style={{
              background: 'linear-gradient(135deg, #13131f 0%, #16162a 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '22px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Activity size={16} color="#ef4444" />
                <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 15 }}>System Health</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px',
                  background: health?.db_status === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: health?.db_status === 'ok' ? '#22c55e' : '#ef4444',
                }}>
                  {health?.db_status === 'ok' ? '✓ All systems operational' : '✗ DB issue'}
                </span>
              </div>
              {[
                { label: 'Database',     value: health?.db_status === 'ok' ? 'Connected' : 'Error', ok: health?.db_status === 'ok' },
                { label: 'Uptime',       value: formatUptime(health?.uptime_seconds ?? 0), ok: true },
                { label: 'Memory',       value: `${health?.memory_mb ?? 0} MB heap`, ok: (health?.memory_mb ?? 0) < 512 },
                { label: 'Node.js',      value: health?.node_version ?? '—', ok: true },
                { label: 'Total Trips',  value: health?.total_trips?.toLocaleString() ?? '0', ok: true },
              ].map(({ label, value, ok }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ok ? <CheckCircle2 size={12} color="#22c55e" /> : <AlertTriangle size={12} color="#ef4444" />}
                    <span style={{ fontSize: 13, color: ok ? '#e5e7eb' : '#ef4444', fontWeight: 600 }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Agency Balance Table */}
            <div style={{
              background: 'linear-gradient(135deg, #13131f 0%, #16162a 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <CreditCard size={16} color="#ef4444" />
                <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 15 }}>Agency Balances</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
                  Total top-ups: {billing?.total_trips_credited ?? 0} trips
                </span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 320 }}>
                {billing?.agency_wallets.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#4b5563', padding: 32 }}>No agencies yet</div>
                )}
                {billing?.agency_wallets.map((a) => (
                  <div key={a.agency_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 600 }}>{a.agency_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: a.low_trips ? '#ef4444' : '#22c55e',
                      }}>
                        {a.trips_remaining} trips
                      </div>
                      {a.low_trips && (
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>LOW BALANCE</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
