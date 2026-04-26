'use client';

import { useEffect, useState } from 'react';
import { get, post, put } from '@/lib/api';
import { CreditCard, TrendingUp, AlertTriangle, Search, Plus, Settings, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

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
  balance_after: number;
  type: 'trip_topup' | 'trip_deduction';
  description: string;
  reference_id: string;
  created_at: string;
}

const CELL: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)',
};
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, color: '#6b7280', fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.02)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

export default function AdminWalletPage() {
  const [summary, setSummary]     = useState<WalletSummary | null>(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<AgencyWallet | null>(null);
  const [selectedWalletDetail, setSelectedWalletDetail] = useState<{trips_remaining: number, trips_used_this_month: number, low_trip_threshold: number} | null>(null);
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Topup modal
  const [showTopup, setShowTopup]   = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc]   = useState('');
  const [topping, setTopping]       = useState(false);

  // Config modal
  const [showConfig, setShowConfig]     = useState(false);
  const [configThreshold, setConfigThreshold] = useState('');
  const [saving, setSaving]           = useState(false);

  const load = () => {
    setLoading(true);
    get<WalletSummary>('/api/admin/wallet/summary')
      .then((r) => setSummary(r))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectAgency = async (a: AgencyWallet) => {
    setSelected(a);
    setTxLoading(true);
    try {
      const r = await get<{ wallet: any, transactions: Transaction[] }>(`/api/admin/wallet/${a.agency_id}`);
      setTxns(r.transactions ?? []);
      setSelectedWalletDetail(r.wallet);
    } finally { setTxLoading(false); }
  };

  const doTopup = async () => {
    if (!selected || !topupAmount) return;
    setTopping(true);
    try {
      await post(`/api/admin/wallet/${selected.agency_id}/topup`, {
        trips: Number(topupAmount),
        description: topupDesc || undefined,
      });
      setShowTopup(false);
      setTopupAmount(''); setTopupDesc('');
      load();
      await selectAgency(selected);
    } catch (e: any) { alert(e?.message ?? 'Top-up failed'); }
    finally { setTopping(false); }
  };

  const doConfig = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await put(`/api/admin/wallet/${selected.agency_id}/config`, {
        low_trip_threshold: configThreshold ? Number(configThreshold) : undefined,
      });
      setShowConfig(false);
      load();
      await selectAgency(selected);
    } catch (e: any) { alert(e?.message ?? 'Config update failed'); }
    finally { setSaving(false); }
  };

  const filtered = summary?.agency_wallets.filter((a) =>
    !search || a.agency_name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Wallet Management</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>Platform-wide trip credits, agency wallets, and top-ups</p>
      </div>

      {/* Summary KPIs */}
      {!loading && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: TrendingUp, label: 'Total Trips Consumed', value: summary.total_trips_consumed.toLocaleString(), color: '#ef4444' },
            { icon: ArrowUpCircle, label: 'Total Trips Credited', value: summary.total_trips_credited.toLocaleString(), color: '#22c55e' },
            { icon: CreditCard, label: 'Agencies Tracked', value: summary.agency_count, color: '#a78bfa' },
            { icon: AlertTriangle, label: 'Low Balance', value: `${summary.low_trips_agencies} agencies`, color: '#f59e0b' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f3f4f6' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        {/* Agency list */}
        <div style={{
          background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#6b7280" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="wallet-search"
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter agencies…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', color: '#e5e7eb', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#4b5563' }}>No agencies matching "{search}"</div>
            ) : filtered.map((a) => (
              <div
                key={a.agency_id}
                id={`agency-row-${a.agency_id}`}
                onClick={() => selectAgency(a)}
                style={{
                  padding: '14px 18px', cursor: 'pointer', transition: 'background 0.1s',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selected?.agency_id === a.agency_id ? 'rgba(239,68,68,0.08)' : 'transparent',
                  borderLeft: selected?.agency_id === a.agency_id ? '3px solid #ef4444' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: '#e5e7eb', fontSize: 13 }}>{a.agency_name}</span>
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    color: a.low_trips ? '#ef4444' : '#22c55e',
                  }}>{a.trips_remaining} trips</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{a.trips_used_this_month} used this month</span>
                  {a.low_trips && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ LOW</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction detail panel */}
        <div style={{
          background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, minHeight: 400
        }}>
          {!selected ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CreditCard size={32} color="#4b5563" style={{ marginBottom: 12 }} />
              <div>Select an agency to view wallet activity</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 15 }}>{selected.agency_name}</div>
                  <div style={{ fontSize: 12, color: selected.low_trips ? '#ef4444' : '#22c55e', marginTop: 2 }}>
                    Balance: {selected.trips_remaining} trips · {selected.trips_used_this_month} used this month
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button id="config-btn" onClick={() => { setShowConfig(true); setConfigThreshold(selectedWalletDetail?.low_trip_threshold?.toString() || ''); }} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#9ca3af', cursor: 'pointer', fontSize: 12,
                  }}>
                    <Settings size={12} /> Config
                  </button>
                  <button id="topup-btn" onClick={() => setShowTopup(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                    borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    <Plus size={12} /> Add Trips
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {txLoading ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                    Loading transactions…
                  </div>
                ) : txns.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#4b5563' }}>No transactions yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Type', 'Change', 'Final Balance', 'Note'].map((h) => (
                          <th key={h} style={TH}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t) => (
                        <tr key={t.id}>
                          <td style={CELL}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                          <td style={CELL}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: t.type === 'trip_topup' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: t.type === 'trip_topup' ? '#22c55e' : '#ef4444',
                              textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}>
                              {t.type === 'trip_topup' ? '↑ Topup' : '↓ Deduction'}
                            </span>
                          </td>
                          <td style={{ ...CELL, fontWeight: 700, color: t.trips_amount > 0 ? '#22c55e' : '#ef4444' }}>
                            {t.trips_amount > 0 ? '+' : ''}{t.trips_amount}
                          </td>
                          <td style={{ ...CELL, color: '#9ca3af' }}>{t.balance_after}</td>
                          <td style={{ ...CELL, color: '#6b7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopup && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#16162a', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '28px', width: 380 }}>
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 6px', fontSize: 18 }}>Add Trip Credits</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{selected.agency_name}</p>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Trips to Add *</label>
            <input id="topup-amount" type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="e.g. 50"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 14 }}
            />
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Description</label>
            <input id="topup-desc" type="text" value={topupDesc} onChange={(e) => setTopupDesc(e.target.value)}
              placeholder="e.g. Monthly top-up"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowTopup(false)} style={{ flex: 1, padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
              <button id="confirm-topup-btn" onClick={doTopup} disabled={topping} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {topping ? 'Processing…' : `Add ${topupAmount || '0'} Trips`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#16162a', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '28px', width: 380 }}>
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 6px', fontSize: 18 }}>Wallet Configuration</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{selected.agency_name}</p>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Low Trip Threshold</label>
            <input id="config-threshold" type="number" min="0" value={configThreshold} onChange={(e) => setConfigThreshold(e.target.value)}
              placeholder="e.g. 10"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfig(false)} style={{ flex: 1, padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
              <button id="save-config-btn" onClick={doConfig} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Update Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
