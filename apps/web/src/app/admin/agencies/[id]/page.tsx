'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { 
  Building2, Users, Bus, CreditCard, ChevronLeft, 
  Loader2, ShieldCheck, MapPin, Phone,
  Calendar, Activity, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, Zap, ExternalLink, Layout, Edit
} from 'lucide-react';

interface AgencyDetails {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  is_active: boolean;
  state: string;
  created_at: string;
  wallet: {
    trips_remaining: number;
    trips_used_this_month: number;
    low_trip_threshold: number;
  };
  stats: {
    total_buses: number;
    total_staff: number;
    active_trips: number;
  };
  recent_transactions: any[];
}

function StatBox({ label, value, icon: Icon, color }: any) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '20px',
      flex: 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</div>
    </div>
  );
}

export default function AgencyDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  
  const [isOwnerMode, setIsOwnerMode] = useState(false);

  const { data: agency, isLoading, error } = useQuery<AgencyDetails>({
    queryKey: ['admin-agency', id],
    queryFn: () => get<AgencyDetails>(`/api/admin/agencies/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: () => post(`/api/admin/agencies/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agency', id] });
      qc.invalidateQueries({ queryKey: ['admin-agencies'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Toggle failed';
      window.alert(msg);
    }
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-secondary)" />
        <p style={{ marginTop: 16, color: 'var(--color-on-surface-muted)', fontSize: 14 }}>Retrieving operational data...</p>
      </div>
    );
  }

  if (error || !agency) {
    const errObj = error as any;
    const status = errObj?.response?.status;
    const msg = errObj?.response?.data?.error?.message ?? errObj?.message ?? 'Unknown error';
    
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="var(--color-accent)" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ color: '#fff' }}>Load Failed</h2>
        <p style={{ color: 'var(--color-on-surface-muted)', marginBottom: 8, maxWidth: 480, margin: '0 auto 8px' }}>
          {status === 404 ? 'Agency not found in registry' : `Failed to load agency: ${msg} (${status ?? 'network error'})`}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#EF4444', marginBottom: 24 }}>ID: {id}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 20px', background: 'var(--color-secondary)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>GO BACK</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Breadcrumb & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => router.back()}
            style={{ padding: 8, background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>{agency.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>ID: {agency.id.slice(0, 8)}</span>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-border)' }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: agency.is_active ? '#22C55E' : '#EF4444' }}>{agency.is_active ? 'ACTIVE NODE' : 'INACTIVE'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => router.push(`/admin/agencies?edit=${id}`)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
              background: '#1E293B', border: '1px solid var(--color-border)', 
              borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' 
            }}
          >
            <Edit size={14} /> EDIT INFO
          </button>
          <button 
            onClick={() => setIsOwnerMode(!isOwnerMode)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
              background: isOwnerMode ? 'rgba(108, 99, 255, 0.2)' : '#1E293B', 
              border: `1px solid ${isOwnerMode ? '#6C63FF' : 'var(--color-border)'}`, 
              borderRadius: 8, color: isOwnerMode ? '#6C63FF' : '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' 
            }}
          >
            <Layout size={14} />
            {isOwnerMode ? 'EXIT AGENCY MODE' : 'ENTER AGENCY MODE'}
          </button>
          <button 
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            style={{ padding: '10px 20px', background: agency.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `1px solid ${agency.is_active ? '#EF4444' : '#22C55E'}`, borderRadius: 8, color: agency.is_active ? '#EF4444' : '#22C55E', fontSize: 12, fontWeight: 800, cursor: toggleMutation.isPending ? 'wait' : 'pointer' }}>
            {toggleMutation.isPending ? 'PROCESSING...' : (agency.is_active ? 'DEACTIVATE' : 'ACTIVATE')}
          </button>
        </div>
      </div>

      {isOwnerMode ? (
        /* Agency Owner View Placeholder */
        <div style={{ 
          background: '#1E293B', borderRadius: 24, border: '1px solid var(--color-border)', padding: 60,
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24
        }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExternalLink size={40} color="#6C63FF" />
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>Agency Operational Mode</h2>
            <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 16, marginTop: 12, maxWidth: 500 }}>
              You are now viewing the system as the owner of <strong>{agency.name}</strong>. 
              Once the Agency Owner screen designs are finalized, they will appear here.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%', maxWidth: 800, marginTop: 20 }}>
            <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)', marginBottom: 8 }}>FLEET MGMT</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{agency.stats.total_buses} BUSES</div>
            </div>
            <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)', marginBottom: 8 }}>STAFF MGMT</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{agency.stats.total_staff} USERS</div>
            </div>
            <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)', marginBottom: 8 }}>TRIP MGMT</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{agency.stats.active_trips} ACTIVE</div>
            </div>
          </div>
          <button 
            onClick={() => setIsOwnerMode(false)}
            style={{ marginTop: 20, padding: '12px 24px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            RETURN TO DIAGNOSTICS
          </button>
        </div>
      ) : (
        /* Admin Diagnostic View */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Top Stats */}
            <div style={{ display: 'flex', gap: 20 }}>
              <StatBox label="OPERATIONAL FLEET" value={agency.stats.total_buses} icon={Bus} color="var(--color-secondary)" />
              <StatBox label="ACTIVE MANPOWER" value={agency.stats.total_staff} icon={Users} color="var(--color-primary)" />
              <StatBox label="LIVE TRIPS" value={agency.stats.active_trips} icon={Zap} color="var(--color-accent)" />
            </div>

            {/* Agency Intelligence Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Wallet Panel */}
              <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <CreditCard size={18} color="var(--color-secondary)" />
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>WALLET INTELLIGENCE</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)', marginBottom: 4 }}>AVAILABLE CREDITS</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: agency.wallet.trips_remaining < 5 ? 'var(--color-accent)' : '#fff' }}>{agency.wallet.trips_remaining} <span style={{ fontSize: 14, color: 'var(--color-on-surface-muted)', fontWeight: 600 }}>TRIPS</span></div>
                  </div>
                  <div style={{ height: 1, background: 'var(--color-border)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>THIS MONTH</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4 }}>{agency.wallet.trips_used_this_month}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>THRESHOLD</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4 }}>{agency.wallet.low_trip_threshold}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/admin/wallet?agencyId=${agency.id}`)}
                    style={{ width: '100%', padding: '12px', background: 'var(--color-secondary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                  >
                    MANAGE WALLET
                  </button>
                </div>
              </div>

              {/* Profile Panel */}
              <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Building2 size={18} color="var(--color-primary)" />
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>ENTITY PROFILE</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><ShieldCheck size={16} color="var(--color-on-surface-muted)" /></div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>OWNER NAME</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{agency.owner_name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Phone size={16} color="var(--color-on-surface-muted)" /></div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>CONTACT PHONE</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{agency.owner_phone}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><MapPin size={16} color="var(--color-on-surface-muted)" /></div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>REGION</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{agency.state}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Calendar size={16} color="var(--color-on-surface-muted)" /></div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>JOINED DATE</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{new Date(agency.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Logs for this Agency */}
            <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>ENTITY ACTIVITY STREAM</h3>
                </div>
                <button 
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(agency.recent_transactions, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `agency_${agency.id}_logs.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-on-surface-muted)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                  EXPORT LOGS
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {agency.recent_transactions.slice(0, 5).map((t, idx) => (
                  <div key={idx} style={{ 
                    padding: '12px 16px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--color-border)', 
                    borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {t.type === 'trip_topup' ? <ArrowUpCircle size={16} color="#22C55E" /> : <ArrowDownCircle size={16} color="#EF4444" />}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{t.type === 'trip_topup' ? 'CREDIT ISSUED' : 'TRIP CONSUMED'}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-on-surface-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.type === 'trip_topup' ? '#22C55E' : '#EF4444' }}>
                      {t.type === 'trip_topup' ? '+' : '-'}{Math.abs(t.trips_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Operational Health */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ background: '#0B0D10', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '0 0 20px', letterSpacing: '0.1em' }}>DIAGNOSTIC STATUS</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>GPS Uplink</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#22C55E' }}>STABLE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>API Handshake</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#22C55E' }}>STABLE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>Auth Token Sync</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#22C55E' }}>STABLE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>Real-time Delay</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-accent)' }}>1.2s (HIGH)</span>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', marginBottom: 12 }}>SYSTEM LOAD</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '64%', background: 'var(--color-secondary)', boxShadow: '0 0 10px var(--color-secondary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-on-surface-muted)' }}>Utilization</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>64%</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '0.1em' }}>QUICK ACTIONS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => router.push(`/admin/wallet?agencyId=${agency.id}`)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>OPEN WALLET PANEL</button>
                <button onClick={() => router.push('/admin/health')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>VIEW SYSTEM HEALTH</button>
                <button onClick={() => router.push('/admin/audit')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>OPEN AUDIT STREAM</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
