'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Plus, Search, Building2, CheckCircle2, XCircle, Loader2, Mail, Phone, RefreshCcw, ExternalLink } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  is_active: boolean;
  trips_this_month: number;
  trips_remaining: number;
  state: string;
  created_at: string;
}

interface Invite {
  id: string;
  phone: string;
  invite_token: string;
  status: string;
  expires_at: string;
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
  const [invites, setInvites]     = useState<Invite[]>([]);
  const [filtered, setFiltered]   = useState<Agency[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Invite form
  const [invitePhone, setInvitePhone] = useState('+91');
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [agRes, invRes] = await Promise.all([
        get<Agency[]>('/api/admin/agencies'),
        get<Invite[]>('/api/admin/agencies/invites')
      ]);
      setAgencies(agRes);
      setFiltered(agRes);
      setInvites(invRes);
    } catch (e) {
      console.error('Failed to load agencies/invites', e);
    } finally {
      setLoading(false);
    }
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

  const sendInvite = async () => {
    setInviteError('');
    if (!invitePhone || invitePhone.length < 10) {
      return setInviteError('Valid phone number is required.');
    }
    setInviting(true);
    try {
      const res: any = await post('/api/admin/agencies/invite', { phone: invitePhone });
      setLastInviteLink(res.data.invite_link);
      setInvitePhone('+91');
      load();
    } catch (e: any) {
      setInviteError(e?.message ?? 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const resendInvite = async (id: string) => {
    setResending(id);
    try {
      const res: any = await post(`/api/admin/agencies/invite/${id}/resend`, {});
      alert(`Invite link: ${res.data.invite_link}`);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to resend invite');
    } finally {
      setResending(null);
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
        <button id="invite-agency-btn" onClick={() => { setShowModal(true); setLastInviteLink(''); }} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9,
          background: '#ef4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Mail size={15} /> Invite Agency
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

      {/* Main Agency Table */}
      <div style={{
        background: 'linear-gradient(135deg, #13131f 0%, #16162a 100%)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden',
        marginBottom: 40
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Agency', 'Owner', 'State', 'Trips/Month', 'Remaining', 'Status', 'Action'].map((h) => (
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
                <td style={{ ...CELL, fontWeight: 700, color: a.trips_remaining < 5 ? '#ef4444' : '#22c55e' }}>
                  {a.trips_remaining} trips
                  {a.trips_remaining < 5 && (
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

      {/* Pending Invites Section */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f3f4f6', marginBottom: 16 }}>Pending Invites</h2>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Phone', 'Status', 'Expires', 'Created At', 'Action'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && invites.filter(i => i.status === 'pending').length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#4b5563', padding: 32 }}>No pending invites</td></tr>
            ) : invites.filter(i => i.status === 'pending').map((i) => (
              <tr key={i.id}>
                <td style={CELL}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={13} color="#6b7280" />
                    <span style={{ color: '#e5e7eb' }}>{i.phone}</span>
                  </div>
                </td>
                <td style={CELL}>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>
                    {i.status}
                  </span>
                </td>
                <td style={{ ...CELL, color: '#9ca3af' }}>{new Date(i.expires_at).toLocaleDateString()}</td>
                <td style={{ ...CELL, color: '#6b7280' }}>{new Date(i.created_at).toLocaleString()}</td>
                <td style={CELL}>
                  <button
                    onClick={() => resendInvite(i.id)}
                    disabled={resending === i.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#d1d5db'
                    }}
                  >
                    {resending === i.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                    Resend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#16162a', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 16, padding: '28px 28px 24px', width: 400, boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontWeight: 800, color: '#f3f4f6', margin: '0 0 10px', fontSize: 18 }}>Invite Agency</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
              Send an onboarding link to the agency owner via phone number.
            </p>

            {inviteError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
                {inviteError}
              </div>
            )}

            {lastInviteLink ? (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#22c55e', marginBottom: 8, fontWeight: 600 }}>Invite Created Successfully!</label>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  background: 'rgba(34,197,94,0.05)', padding: '10px', borderRadius: 8,
                  border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <input readOnly value={lastInviteLink} style={{ 
                    background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 12, flex: 1, outline: 'none'
                  }} />
                  <button onClick={() => { navigator.clipboard.writeText(lastInviteLink); alert('Copied!'); }} style={{
                    background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer'
                  }}>Copy</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: 600 }}>Owner Phone Number (E.164)</label>
                <input
                  id="invite-phone" type="text"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
              }}>{lastInviteLink ? 'Close' : 'Cancel'}</button>
              {!lastInviteLink && (
                <button id="send-invite-btn" onClick={sendInvite} disabled={inviting} style={{
                  flex: 1.5, padding: '10px', borderRadius: 9, border: 'none',
                  background: inviting ? '#7f1d1d' : '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
