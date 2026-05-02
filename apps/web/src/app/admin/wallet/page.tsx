'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CreditCard, TrendingUp, AlertTriangle, Search, Plus, Settings,
  Loader2, ArrowUpCircle, ArrowDownCircle, Wallet, ShieldCheck, Activity, Filter,
} from 'lucide-react';

interface AgencyWallet {
  agency_id: string;
  agency_name: string;
  trips_remaining: number;
  trips_used_this_month: number;
  low_trips: boolean;
}

interface WalletSummary {
  total_trips_consumed: number;
  total_trips_credited: number;
  agency_count: number;
  low_trips_agencies: number;
  agency_wallets: AgencyWallet[];
}

interface Transaction {
  id: string;
  trips_amount: number;
  trips_remaining_after: number;
  type: 'trip_topup' | 'trip_deduction';
  description: string;
  reference_id: string;
  created_at: string;
}

type AxiosLikeError = {
  response?: {
    data?: {
      error?: { message?: string } | string;
    };
  };
  message?: string;
};

function apiErr(e: unknown): string {
  const payload = e as AxiosLikeError;
  const er = payload.response?.data?.error;
  if (typeof er === 'string') return er;
  if (er && typeof er === 'object' && 'message' in er && typeof (er as { message?: string }).message === 'string') {
    return (er as { message: string }).message;
  }
  return payload.message ?? 'Request failed';
}

function StatCard({ label, value, icon: Icon, color, subtext }: any) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ padding: 8, background: `${color}15`, borderRadius: 8 }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 4 }}>{subtext}</div>}
      </div>
    </div>
  );
}

function AdminWalletInner() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const urlAgencyId = searchParams.get('agencyId');

  const [search, setSearch] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [topping, setTopping] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configThreshold, setConfigThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (urlAgencyId) setSelectedAgencyId(urlAgencyId);
  }, [urlAgencyId]);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryIsError,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery<WalletSummary>({
    queryKey: ['admin-wallet-summary'],
    queryFn: () => get<WalletSummary>('/api/admin/wallet/summary'),
    staleTime: 30_000,
  });

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery<{ wallet: { low_trip_threshold?: number }; transactions: Transaction[] }>({
    queryKey: ['admin-wallet-detail', selectedAgencyId],
    queryFn: () =>
      get<{ wallet: { low_trip_threshold?: number }; transactions: Transaction[] }>(
        `/api/admin/wallet/${selectedAgencyId}`
      ),
    enabled: !!selectedAgencyId,
    staleTime: 60_000,
  });

  const txns = detail?.transactions ?? [];
  const selectedWalletDetail = detail?.wallet ?? null;
  const selected = summary?.agency_wallets.find((a) => a.agency_id === selectedAgencyId) ?? null;

  const selectAgency = (a: AgencyWallet) => {
    setSelectedAgencyId(a.agency_id);
  };

  const doTopup = async () => {
    if (!selectedAgencyId || !topupAmount.trim()) {
      toast.error('Enter the number of trips to add.');
      return;
    }
    const trips = parseInt(topupAmount, 10);
    if (Number.isNaN(trips) || trips < 1) {
      toast.error('Enter a valid positive number of trips.');
      return;
    }
    setTopping(true);
    try {
      await post(`/api/admin/wallet/${selectedAgencyId}/topup`, {
        trips,
        description: topupDesc.trim() || undefined,
      });
      setShowTopup(false);
      setTopupAmount('');
      setTopupDesc('');
      await queryClient.invalidateQueries({ queryKey: ['admin-wallet-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-wallet-detail', selectedAgencyId] });
      await refetchSummary();
      toast.success('Wallet topped up successfully.');
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setTopping(false);
    }
  };

  const saveConfig = async () => {
    if (!selectedAgencyId || !configThreshold.trim()) {
      toast.error('Enter a threshold value.');
      return;
    }
    const n = parseInt(configThreshold, 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Enter a valid threshold (0 or greater).');
      return;
    }
    setSaving(true);
    try {
      await put(`/api/admin/wallet/${selectedAgencyId}/config`, {
        low_trip_threshold: n,
      });
      setShowConfig(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-wallet-detail', selectedAgencyId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-wallet-summary'] });
      toast.success('Alert threshold updated.');
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    summary?.agency_wallets.filter(
      (a) => !search || a.agency_name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  const summaryErrMsg = summaryIsError ? apiErr(summaryError) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {summaryErrMsg && (
        <div style={{ padding: 32, textAlign: 'center', background: '#1E293B', border: '1px solid #EF4444', borderRadius: 12 }}>
          <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: 12 }}>{summaryErrMsg}</div>
          <button
            type="button"
            onClick={() => void refetchSummary()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {!summaryLoading && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <StatCard
            label="CREDITS IN CIRCULATION"
            value={summary.total_trips_credited.toLocaleString()}
            icon={TrendingUp}
            color="var(--color-secondary)"
            subtext="Total trips issued to all agencies"
          />
          <StatCard
            label="ACTIVE CONSUMPTION"
            value={summary.total_trips_consumed.toLocaleString()}
            icon={Activity}
            color="#EF4444"
            subtext="Trips utilized this cycle"
          />
          <StatCard
            label="REGISTERED ENTITIES"
            value={summary.agency_count}
            icon={ShieldCheck}
            color="var(--color-primary)"
            subtext="Active agency wallets"
          />
          <StatCard
            label="LIQUIDITY ALERTS"
            value={summary.low_trips_agencies}
            icon={AlertTriangle}
            color="var(--color-accent)"
            subtext="Agencies below threshold"
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32, alignItems: 'start' }}>
        <div
          style={{
            background: '#1E293B',
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>
                AGENCY LEDGER
              </h3>
              <Filter size={16} color="var(--color-on-surface-muted)" />
            </div>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                color="var(--color-on-surface-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find agency..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {summaryLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Loader2 className="animate-spin" color="var(--color-secondary)" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-muted)', fontSize: 14 }}>
                {search ? 'No agencies match your search.' : 'No agency wallets loaded.'}
              </div>
            ) : (
              filtered.map((a) => (
                <div
                  key={a.agency_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectAgency(a)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectAgency(a);
                  }}
                  style={{
                    padding: '20px 24px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)',
                    background: selected?.agency_id === a.agency_id ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                    transition: 'all 0.2s',
                    borderLeft: `3px solid ${selected?.agency_id === a.agency_id ? 'var(--color-secondary)' : 'transparent'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{a.agency_name}</span>
                    <span
                      style={{
                        fontWeight: 800,
                        color: a.low_trips ? 'var(--color-accent)' : '#22C55E',
                        fontSize: 14,
                      }}
                    >
                      {a.trips_remaining}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)' }}>
                      Usage: {a.trips_used_this_month} this month
                    </span>
                    {a.low_trips && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 900,
                          background: 'rgba(255,122,0,0.1)',
                          color: 'var(--color-accent)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        LOW LIQUIDITY
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', minHeight: 600 }}>
          {!selected ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 600,
                color: 'var(--color-on-surface-muted)',
                gap: 16,
              }}
            >
              <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }}>
                <Wallet size={48} opacity={0.2} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Select an entity to view transaction history</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '24px 32px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{selected.agency_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>
                      ID: {selected.agency_id.slice(0, 8)}...
                    </span>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-border)' }} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: selected.low_trips ? 'var(--color-accent)' : '#22C55E',
                      }}
                    >
                      {selected.trips_remaining} CREDITS AVAILABLE
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfig(true);
                      setConfigThreshold(selectedWalletDetail?.low_trip_threshold?.toString() || '');
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Settings size={14} /> THRESHOLD
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTopup(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--color-secondary)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Plus size={16} /> ADD CREDITS
                  </button>
                </div>
              </div>

              <div style={{ padding: '32px' }}>
                {detailLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}>
                    <Loader2 className="animate-spin" color="var(--color-secondary)" />
                  </div>
                ) : txns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-on-surface-muted)' }}>
                    No historical records found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {txns.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: '16px 20px',
                          background: 'rgba(0,0,0,0.1)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background:
                                t.type === 'trip_topup' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {t.type === 'trip_topup' ? (
                              <ArrowUpCircle size={20} color="#22C55E" />
                            ) : (
                              <ArrowDownCircle size={20} color="#EF4444" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                              {t.type === 'trip_topup' ? 'CREDIT RECHARGE' : 'TRIP DEBIT'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>
                              {new Date(t.created_at).toLocaleDateString()} • {t.description || 'System auto-processed'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: t.type === 'trip_topup' ? '#22C55E' : '#EF4444',
                            }}
                          >
                            {t.type === 'trip_topup' ? '+' : '-'}
                            {Math.abs(t.trips_amount)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>
                            BAL AFTER: {t.trips_remaining_after ?? '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showTopup && selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              padding: '32px',
              width: 440,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Issue Trip Credits</h2>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-muted)', marginTop: 8 }}>
              Recharging: {selected.agency_name}
            </p>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-on-surface-muted)',
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  CREDIT AMOUNT (TRIPS)
                </label>
                <input
                  type="number"
                  min={1}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Enter trip count..."
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-on-surface-muted)',
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  AUDIT NOTE
                </label>
                <input
                  type="text"
                  value={topupDesc}
                  onChange={(e) => setTopupDesc(e.target.value)}
                  placeholder="Reference number or note..."
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button
                type="button"
                onClick={() => setShowTopup(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => void doTopup()}
                disabled={topping || !topupAmount.trim()}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--color-secondary)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: topping || !topupAmount.trim() ? 0.5 : 1,
                }}
              >
                {topping ? 'PROCESSING...' : 'CONFIRM RECHARGE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfig && selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              padding: '32px',
              width: 440,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Alert Threshold</h2>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-muted)', marginTop: 8 }}>
              Configuration for {selected.agency_name}
            </p>

            <div style={{ marginTop: 24 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--color-on-surface-muted)',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                LOW CREDIT LIMIT
              </label>
              <input
                type="number"
                min={0}
                value={configThreshold}
                onChange={(e) => setConfigThreshold(e.target.value)}
                placeholder="e.g. 10 trips"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 8 }}>
                The system will flag this agency when credits fall below this value.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'SAVING...' : 'UPDATE LIMIT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminWalletPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-on-surface-muted)' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          Loading wallet…
        </div>
      }
    >
      <AdminWalletInner />
    </Suspense>
  );
}
