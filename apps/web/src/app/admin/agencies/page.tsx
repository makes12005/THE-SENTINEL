'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Plus, Search, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  is_active: boolean;
  trips_this_month: number;
  balance_rupees: number;
  state: string;
  created_at: string;
}

const CELL: React.CSSProperties = {
  padding: '13px 14px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)',
};
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, color: '#6b7280', fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.02)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

export default function AdminAgenciesPage() {
  const [agencies, setAgencies]   = useState<Agency[]>([]);
  const [filtered, setFiltered]   = useState<Agency[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Create form
  const [form, setForm] = useState({ name: '', ownerName: '', ownerPhone: '+91', ownerEmail: '', ownerPassword: '', state: '' });
  const [creating, setCreating]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    get<Agency[]>('/api/admin/agencies')
      .then((r) => { setAgencies(r); setFiltered(r); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? agencies.filter((a) =>
      a.name.toLowerCase().includes(q) || a.owner_name.toLowerCase().includes(q) || a.state.toLowerCase().includes(q)
    ) : agencies);
  }, [search, agencies]);

  const toggle = async (id: string) => {
    setToggling(id);
    await post(`/api/admin/agencies/${id}/toggle`, {});
    await load();
    setToggling(null);
  };

  const createAgency = async () => {
    setFormError('');
    if (!form.name || !form.ownerName || !form.ownerPhone || !form.ownerPassword) {
      return setFormError('All required fields must be filled.');
    }
    setCreating(true);
    try {
      await post('/api/admin/agencies', form);
      setShowModal(false);
      setForm({ name: '', ownerName: '', ownerPhone: '+91', ownerEmail: '', ownerPassword: '', state: '' });
      load();
    } catch (e: any) {
      setFormError(e?.message ?? 'Failed to create agency');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Agencies</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
            {agencies.length} total · {agencies.filter((a) => a.is_active).length} active
          </p>
        </div>
        <button id="create-agency-btn" onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9,
          background: '#ef4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={15} /> New Agency
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={14} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          id="agency-search"
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, owner, state…"
          style={{
            width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: 'linear-gradient(135deg, #13131f 0%, #16162a 100%)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Agency', 'Owner', 'State', 'Trips/Month', 'Balance', 'Status', 'Action'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: 48 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#4b5563', padding: 48 }}>No agencies found</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} style={{ transition: 'background 0.1s' }}>
                <td style={CELL}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={14} color="#ef4444" />
                    <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{a.name}</span>
                  </div>
                </td>
                <td style={CELL}>
                  <div style={{ fontWeight: 500, color: '#e5e7eb' }}>{a.owner_name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{a.owner_phone}</div>
                </td>
                <td style={{ ...CELL, color: '#9ca3af' }}>{a.state || '—'}</td>
                <td style={{ ...CELL, textAlign: 'center' }}>{a.trips_this_month}</td>
                <td style={{ ...CELL, fontWeight: 700, color: a.balance_rupees < 100 ? '#ef4444' : '#22c55e' }}>
                  ₹{a.balance_rupees.toFixed(2)}
                  {a.balance_rupees < 100 && (
                    <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, letterSpacing: '0.06em' }}>LOW</div>
                  )}
                </td>
                <td style={CELL}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: a.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: a.is_active ? '#22c55e' : '#ef4444',
                  }}>
                    {a.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {a.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={CELL}>
                  <button
                    id={`toggle-agency-${a.id}`}
                    onClick={() => toggle(a.id)}
                    disabled={toggling === a.id}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${a.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      background: a.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                      color: a.is_active ? '#ef4444' : '#22c55e',
                    }}
                  >
                    {toggling === a.id ? <Loader2 size={12} className="animate-spin" /> : a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Agency Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#16162a', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 16, padding: '28px 28px 24px', width: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 20px', fontSize: 18 }}>Create New Agency</h2>
            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}
            {[
              { id: 'f-name', key: 'name', label: 'Agency Name *', type: 'text', placeholder: 'Gujarat State Buses' },
              { id: 'f-oname', key: 'ownerName', label: 'Owner Name *', type: 'text', placeholder: 'Rajesh Shah' },
              { id: 'f-ophone', key: 'ownerPhone', label: 'Owner Phone * (E.164)', type: 'text', placeholder: '+91XXXXXXXXXX' },
              { id: 'f-oemail', key: 'ownerEmail', label: 'Owner Email', type: 'email', placeholder: 'owner@example.com' },
              { id: 'f-opwd', key: 'ownerPassword', label: 'Owner Password *', type: 'password', placeholder: '••••••••' },
              { id: 'f-state', key: 'state', label: 'State', type: 'text', placeholder: 'Gujarat' },
            ].map(({ id, key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>{label}</label>
                <input
                  id={id} type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
              <button id="submit-agency-btn" onClick={createAgency} disabled={creating} style={{
                flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                background: creating ? '#7f1d1d' : '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {creating ? 'Creating…' : 'Create Agency'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
