'use client';

import { get } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Bus, Bell, Activity,
  ChevronRight, AlertTriangle, CheckCircle2, Zap, Settings
} from 'lucide-react';

interface HealthData {
  db_status: string;
  total_agencies: number;
  total_users: number;
  total_trips: number;
  active_trips: number;
  upcoming_trips: number;
  completed_today: number;
  alerts_sent_today: number;
  uptime_seconds: number;
  memory_mb: number;
  node_version: string;
  agencies_overview: {
    id: string;
    name: string;
    active_trips: number;
    is_active: boolean;
    status: 'alert' | 'optimal';
  }[];
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
  icon: Icon, label, value, sub, color = '#6C63FF', isAlert, loading
}: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; isAlert?: boolean; loading?: boolean;
}) {
  return (
    <div style={{
      background: '#1E293B',
      border: isAlert ? '1px solid rgba(255, 122, 0, 0.3)' : '1px solid var(--color-border)',
      borderLeft: `4px solid ${isAlert ? '#FF7A00' : color}`,
      borderRadius: 12,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      position: 'relative',
      flex: 1,
      minHeight: 140,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </div>
        {!loading && <Icon size={20} color={isAlert ? '#FF7A00' : color} style={{ opacity: 0.8 }} />}
      </div>
      <div>
        {loading ? (
          <div style={{ height: 38, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, animation: 'pulse 1.5s infinite ease-in-out' }} />
        ) : (
          <>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', marginTop: 4 }}>{sub}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[1, 2, 3, 4, 5].map(i => <KpiCard key={i} icon={Activity} label="Loading..." value="..." loading />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', height: 400, animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', height: 200, animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', height: 200, animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
      </div>
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    error: healthQueryError,
    refetch: refetchHealth,
  } = useQuery<HealthData>({
    queryKey: ['admin-health'],
    queryFn: () => get<HealthData>('/api/admin/health'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 1,
  });

  const {
    data: billing,
    isLoading: billingLoading,
    isError: billingError,
    error: billingQueryError,
    refetch: refetchBilling,
  } = useQuery<BillingSummary>({
    queryKey: ['admin-billing'],
    queryFn: () => get<BillingSummary>('/api/admin/wallet/summary'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 1,
  });

  if (healthLoading || billingLoading) return <DashboardSkeleton />;

  if (healthError || billingError) {
    const ax = (e: unknown) => {
      const x = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      return x?.response?.data?.error?.message ?? x?.message;
    };
    const msg =
      ax(healthQueryError) ||
      ax(billingQueryError) ||
      'Could not load dashboard data.';
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          background: '#1E293B',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 12,
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
        <div style={{ color: '#EF4444', fontWeight: 800, marginBottom: 12, fontSize: 16 }}>Dashboard unavailable</div>
        <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 14, margin: '0 0 20px' }}>{msg}</p>
        <button
          type="button"
          onClick={() => {
            void refetchHealth();
            void refetchBilling();
          }}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'rgba(108, 99, 255, 0.15)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <KpiCard icon={Building2} label="TOTAL AGENCY" value={health?.total_agencies ?? 0} color="#6C63FF" />
        <KpiCard icon={Zap} label="ACTIVE TRIPS" value={health?.active_trips ?? 0} color="#22C55E" />
        <KpiCard icon={Activity} label="TODAY'S TRIPS" value={health?.total_trips ?? 0} color="#3B82F6" />
        <KpiCard icon={Bell} label="TODAY'S ALERTS" value={health?.alerts_sent_today ?? 0} color="#F59E0B" />
        <KpiCard icon={AlertTriangle} label="LOW TRIP BALANCE" value={billing?.low_trips_agencies ?? 0} color="#EF4444" isAlert />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Agency Overview Table */}
        <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>AGENCY OVERVIEW</h2>
            <button onClick={() => router.push('/admin/agencies')} style={{ background: 'none', border: 'none', color: 'var(--color-on-surface-muted)', cursor: 'pointer' }}>
              <Settings size={16} />
            </button>
          </div>
          <style jsx>{`
            .status-alert { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }
            .status-optimal { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
            tr:hover { background: rgba(255, 255, 255, 0.03); }
          `}</style>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>AGENCY NAME</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>ACTIVE TRIPS</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(health?.agencies_overview ?? []).map((agency) => (
                <tr 
                  key={agency.id} 
                  onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s', cursor: 'pointer' }}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                        {agency.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{agency.name}</div>
                        <div style={{ fontSize: 10, color: agency.is_active ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                          {agency.is_active ? '● ONLINE' : '○ OFFLINE'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#6C63FF' }}>{agency.active_trips}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span className={agency.status === 'alert' ? 'status-alert' : 'status-optimal'} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                      {agency.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <ChevronRight size={16} color="var(--color-on-surface-muted)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar Column: Critical Issues + Network Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div id="feature-list" style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>ADMIN FEATURE LIST</h2>
              <CheckCircle2 size={16} color="#22C55E" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Agency activation and diagnostics', path: '/admin/agencies' },
                { label: 'Global trip monitoring', path: '/admin/trips' },
                { label: 'Wallet top-up and threshold management', path: '/admin/wallet' },
                { label: 'Infrastructure health telemetry', path: '/admin/health' },
                { label: 'Audit logs and activity stream', path: '/admin/audit' },
              ].map((feature) => (
                <button
                  key={feature.path}
                  onClick={() => router.push(feature.path)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span>{feature.label}</span>
                  <ChevronRight size={14} color="var(--color-on-surface-muted)" />
                </button>
              ))}
            </div>
          </div>

          {/* Trip Overview */}
          <div 
            onClick={() => router.push('/admin/trips')}
            style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>TRIP OVERVIEW</h2>
              <Bus size={16} color="#3B82F6" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>ACTIVE TRIPS</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#22C55E' }}>{health?.active_trips ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>COMPLETED (TODAY)</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#6C63FF' }}>{health?.completed_today ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>UPCOMING</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B' }}>{health?.upcoming_trips ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Critical Issues */}
          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', borderLeft: '4px solid #FF7A00' }}>
            <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>CRITICAL ISSUES</h2>
              <AlertTriangle size={14} color="#FF7A00" />
            </div>
            <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const lowAgencies = billing?.agency_wallets?.filter(a => a.low_trips) ?? [];
                if (lowAgencies.length === 0) {
                  return (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <CheckCircle2 size={16} color="#22C55E" />
                      <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>All agencies above threshold</span>
                    </div>
                  );
                }
                return lowAgencies.slice(0, 3).map((a) => (
                  <div key={a.agency_id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF7A00', marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Low Trip Balance</div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>
                        {a.agency_name} • {a.trips_remaining} trips left
                      </div>
                    </div>
                  </div>
                ));
              })()}
              <button onClick={() => router.push('/admin/wallet')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                MANAGE WALLETS
              </button>
            </div>
          </div>

          {/* Network Health */}
          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>NETWORK HEALTH</h2>
              <Activity size={16} color="#6C63FF" />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>GLOBAL STABILITY INDEX</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>94%</span>
              </div>
              <div style={{ height: 6, background: '#0F172A', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '94%', height: '100%', background: '#6C63FF', borderRadius: 3 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-on-surface-muted)', fontWeight: 600, marginBottom: 4 }}>API LATENCY</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>24ms</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-on-surface-muted)', fontWeight: 600, marginBottom: 4 }}>DB LOAD</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
