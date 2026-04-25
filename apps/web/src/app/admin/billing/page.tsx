'use client';

import { useEffect, useState } from 'react';
import { get, post, put } from '@/lib/api';
import { CreditCard, TrendingUp, AlertTriangle, Search, Plus, Settings } from 'lucide-react';

interface AgencyBalance {
  agency_id: string;
  agency_name: string;
  balance_paise: number;
  balance_rupees: number;
  per_alert_rupees: number;
  low_balance: boolean;
}

interface BillingSummary {
  total_revenue_rupees: number;
  total_topups_rupees: number;
  agency_count: number;
  low_balance_agencies: number;
  agency_balances: AgencyBalance[];
}

interface Transaction {
  id: string;
  amount_paise: number;
  amount_rupees: number;
  balance_after_rupees: number;
  type: string;
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

export default function AdminBillingPage() {
  const [summary, setSummary]     = useState<BillingSummary | null>(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<AgencyBalance | null>(null);
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Topup modal
  const [showTopup, setShowTopup]   = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc]   = useState('');
  const [topping, setTopping]       = useState(false);

  // Config modal
  const [showConfig, setShowConfig]     = useState(false);
  const [configPerAlert, setConfigPerAlert] = useState('');
  const [configThreshold, setConfigThreshold] = useState('');
  const [saving, setSaving]           = useState(false);

  const load = () => {
    setLoading(true);
    get<BillingSummary>('/api/admin/billing/summary')
      .then((r) => setSummary(r))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectAgency = async (a: AgencyBalance) => {
    setSelected(a);
    setTxLoading(true);
    try {
      const r = await get<{ transactions: Transaction[] }>(`/api/admin/billing/${a.agency_id}`);
      setTxns(r.transactions ?? []);
    } finally { setTxLoading(false); }
  };

  const doTopup = async () => {
    if (!selected || !topupAmount) return;
    setTopping(true);
    try {
      await post(`/api/admin/billing/${selected.agency_id}/topup`, {
        amount_rupees: Number(topupAmount),
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
      await put(`/api/admin/billing/${selected.agency_id}/config`, {
        per_alert_rupees: configPerAlert ? Number(configPerAlert) : undefined,
        low_balance_threshold_rupees: configThreshold ? Number(configThreshold) : undefined,
      });
      setShowConfig(false);
      load();
    } catch (e: any) { alert(e?.message ?? 'Config update failed'); }
    finally { setSaving(false); }
  };

  const filtered = summary?.agency_balances.filter((a) =>
    !search || a.agency_name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Billing Management</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>Platform revenue, agency wallets, and transactions</p>
      </div>

      {/* Summary KPIs */}
      {!loading && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: TrendingUp, label: 'Total Revenue', value: `₹${summary.total_revenue_rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#22c55e' },
            { icon: CreditCard, label: 'Total Top-ups', value: `₹${summary.total_topups_rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#3b82f6' },
            { icon: CreditCard, label: 'Agencies on Plan', value: summary.agency_count, color: '#a78bfa' },
            { icon: AlertTriangle, label: 'Low Balance', value: `${summary.low_balance_agencies} agencies`, color: '#ef4444' },
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
                id="billing-search"
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
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
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
                    color: a.low_balance ? '#ef4444' : '#22c55e',
                  }}>₹{a.balance_rupees.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>₹{a.per_alert_rupees}/alert</span>
                  {a.low_balance && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ LOW BALANCE</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction detail panel */}
        <div style={{
          background: 'linear-gradient(135deg, #13131f, #16162a)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
        }}>
          {!selected ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#4b5563' }}>
              <CreditCard size={32} color="#4b5563" style={{ marginBottom: 12 }} />
              <div>Select an agency to view transactions</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: 15 }}>{selected.agency_name}</div>
                  <div style={{ fontSize: 12, color: selected.low_balance ? '#ef4444' : '#22c55e', marginTop: 2 }}>
                    Balance: ₹{selected.balance_rupees.toFixed(2)} · ₹{selected.per_alert_rupees}/alert
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button id="config-btn" onClick={() => { setShowConfig(true); setConfigPerAlert(''); setConfigThreshold(''); }} style={{
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
                    <Plus size={12} /> Top Up
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {txLoading ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading transactions…</div>
                ) : txns.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#4b5563' }}>No transactions yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Type', 'Amount', 'Balance After', 'Note'].map((h) => (
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
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: t.type === 'topup' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: t.type === 'topup' ? '#22c55e' : '#ef4444',
                            }}>
                              {t.type === 'topup' ? '↑ Topup' : '↓ Deduction'}
                            </span>
                          </td>
                          <td style={{ ...CELL, fontWeight: 700, color: t.amount_paise > 0 ? '#22c55e' : '#ef4444' }}>
                            {t.amount_paise > 0 ? '+' : ''}₹{t.amount_rupees?.toFixed(2)}
                          </td>
                          <td style={{ ...CELL, color: '#9ca3af' }}>₹{t.balance_after_rupees?.toFixed(2)}</td>
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
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 6px', fontSize: 18 }}>Add Balance</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{selected.agency_name}</p>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Amount (₹) *</label>
            <input id="topup-amount" type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="e.g. 500"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 14 }}
            />
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Description</label>
            <input id="topup-desc" type="text" value={topupDesc} onChange={(e) => setTopupDesc(e.target.value)}
              placeholder="e.g. Monthly recharge"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowTopup(false)} style={{ flex: 1, padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
              <button id="confirm-topup-btn" onClick={doTopup} disabled={topping} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {topping ? 'Adding…' : `Add ₹${topupAmount || '?'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#16162a', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '28px', width: 380 }}>
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 6px', fontSize: 18 }}>Billing Config</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{selected.agency_name}</p>
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Per-alert cost (₹)</label>
            <input id="config-per-alert" type="number" min="0" step="0.01" value={configPerAlert} onChange={(e) => setConfigPerAlert(e.target.value)}
              placeholder={`Current: ₹${selected.per_alert_rupees}`}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 14 }}
            />
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Low-balance threshold (₹)</label>
            <input id="config-threshold" type="number" min="0" value={configThreshold} onChange={(e) => setConfigThreshold(e.target.value)}
              placeholder="e.g. 100"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfig(false)} style={{ flex: 1, padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
              <button id="save-config-btn" onClick={doConfig} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
