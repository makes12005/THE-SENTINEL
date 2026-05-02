'use client';

import { useState, useEffect } from 'react';
import { get, post, put } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, Bus, AlertTriangle, CheckCircle2,
  Loader2, Filter, SortDesc, Plus, X, Mail, Link2,
  Clock, RefreshCw, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Agency {
  id: string; name: string; owner_name: string; owner_phone: string;
  is_active: boolean; trips_this_month: number; trips_remaining: number;
  state: string; created_at: string;
}

interface Invite {
  id: string; phone: string; invite_token: string; status: string;
  expires_at: string; created_at: string; accepted_at: string | null;
}

const INPUT = {
  width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '11px 12px', color: '#fff', fontSize: 13, outline: 'none',
  boxSizing: 'border-box' as const,
};
const BTN_PRIMARY = {
  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
  background: '#6C63FF', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13,
};
const BTN_GHOST = {
  flex: 1, padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
};

const AgencyCard = ({ agency, low, onEdit, onToggle }: { agency: Agency; low: boolean; onEdit: (a: Agency) => void; onToggle: (a: Agency) => void }) => {
  const router = useRouter();
  return (
    <div style={{
      background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `4px solid ${low ? '#FF7A00' : 'transparent'}`,
      borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{agency.name}</h3>
          <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.5)', marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
            <Building2 size={10} /> {agency.state || 'Gujarat'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            onClick={() => onEdit(agency)} 
            style={{ border: 'none', background: 'transparent', color: 'rgba(241,245,249,0.3)', cursor: 'pointer', padding: 4 }}
            title="Edit Agency"
          >
            <RefreshCw size={14} />
          </button>
          <span style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800,
            background: agency.is_active ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.05)',
            color: agency.is_active ? '#6C63FF' : 'rgba(241,245,249,0.4)',
          }}>{agency.is_active ? 'ACTIVE' : 'DISABLED'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(241,245,249,0.4)', letterSpacing: '0.05em', marginBottom: 4 }}>TRIPS/MO</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bus size={14} color="#6C63FF" />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{agency.trips_this_month}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(241,245,249,0.4)', letterSpacing: '0.05em', marginBottom: 4 }}>BALANCE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {low ? <AlertTriangle size={14} color="#FF7A00" /> : <CheckCircle2 size={14} color="#22C55E" />}
            <span style={{ fontSize: 18, fontWeight: 800, color: low ? '#FF7A00' : '#fff' }}>{agency.trips_remaining}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => router.push(`/admin/agencies/${agency.id}`)} style={{ ...BTN_GHOST, flex: 1, padding: '9px' }}>VIEW</button>
        {low
          ? <button onClick={() => router.push(`/admin/wallet?agencyId=${agency.id}`)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'rgba(255,122,0,0.2)', color: '#FF7A00', fontWeight: 800, cursor: 'pointer' }}>TOP UP</button>
          : <button onClick={() => onToggle(agency)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: agency.is_active ? '#EF4444' : '#22C55E', fontWeight: 800, cursor: 'pointer' }}>{agency.is_active ? 'DISABLE' : 'ENABLE'}</button>
        }
      </div>
    </div>
  );
};

const InviteRow = ({ invite, onResend }: { invite: Invite; onResend: (id: string) => void }) => {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/onboard?token=${invite.invite_token}`;
  const copy = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const expired = new Date(invite.expires_at) < new Date();
  const statusColor = invite.status === 'accepted' ? '#22C55E' : expired ? '#EF4444' : '#FF7A00';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: '#1E293B', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{invite.phone}</div>
        <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.4)', marginTop: 2 }}>
          Sent {new Date(invite.created_at).toLocaleDateString('en-IN')} · Expires {new Date(invite.expires_at).toLocaleDateString('en-IN')}
        </div>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${statusColor}20`, color: statusColor }}>
        {invite.status.toUpperCase()}
      </span>
      {invite.status === 'pending' && !expired && (
        <>
          <button onClick={copy} title="Copy invite link" style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: copied ? 'rgba(34,197,94,0.1)' : 'transparent', color: copied ? '#22C55E' : 'rgba(241,245,249,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
            <Copy size={12} /> {copied ? 'COPIED' : 'COPY'}
          </button>
          <button onClick={() => onResend(invite.id)} title="Resend invite" style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(241,245,249,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
            <RefreshCw size={12} /> RESEND
          </button>
        </>
      )}
      {expired && invite.status === 'pending' && (
        <button onClick={() => onResend(invite.id)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
          <RefreshCw size={12} /> RENEW
        </button>
      )}
    </div>
  );
};

const FORM_EMPTY = { name: '', ownerName: '', ownerPhone: '', ownerEmail: '', ownerPassword: '', state: '' };

export default function AdminAgenciesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [sortDesc, setSortDesc] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'direct' | 'invite' | 'edit'>('direct');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [invitePhone, setInvitePhone] = useState('');
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [showInvites, setShowInvites] = useState(true);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  const { data: agencies = [], isLoading, error } = useQuery<Agency[]>({
    queryKey: ['admin-agencies'],
    queryFn: () => get<Agency[]>('/api/admin/agencies'),
  });

  const { data: invites = [], refetch: refetchInvites } = useQuery<Invite[]>({
    queryKey: ['admin-invites'],
    queryFn: () => get<Invite[]>('/api/admin/agencies/invites'),
  });

  useEffect(() => {
    const onOpen = () => setShowModal(true);
    window.addEventListener('admin:add-agency', onOpen as EventListener);
    return () => window.removeEventListener('admin:add-agency', onOpen as EventListener);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && agencies.length > 0) {
      const a = agencies.find(x => x.id === editId);
      if (a) {
        setMode('edit');
        setEditingId(a.id);
        setForm({
          ...FORM_EMPTY,
          name: a.name,
          state: a.state || '',
        });
        setShowModal(true);
        // Clear param to avoid re-opening on manual refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [agencies]);

  const normalizePhone = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return raw.trim().startsWith('+') ? raw.trim() : raw.trim();
  };

  const createMutation = useMutation({
    mutationFn: () => post('/api/admin/agencies', {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerPhone: normalizePhone(form.ownerPhone),
      ownerEmail: form.ownerEmail.trim() || undefined,
      ownerPassword: form.ownerPassword,
      state: form.state.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agencies'] });
      setShowModal(false); setForm(FORM_EMPTY); setCreateErr(null);
      toast.success('Agency created.');
    },
    onError: (e: any) => setCreateErr(e?.response?.data?.error?.message ?? 'Failed to create agency'),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => put(`/api/admin/agencies/${id}`, {
      name: form.name.trim(),
      state: form.state.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agencies'] });
      setShowModal(false); setForm(FORM_EMPTY); setEditingId(null);
      toast.success('Agency updated.');
    },
    onError: (e: any) => setCreateErr(e?.response?.data?.error?.message ?? 'Failed to update agency'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => post<{ invite_link: string }>('/api/admin/agencies/invite', { phone: normalizePhone(invitePhone) }),
    onSuccess: (data: { invite_link?: string }) => {
      refetchInvites();
      setInviteResult(data?.invite_link ?? '');
      toast.success('Invite created. Link is ready to share.');
    },
    onError: (e: any) => setCreateErr(e?.response?.data?.error?.message ?? 'Failed to send invite'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => post(`/api/admin/agencies/invite/${id}/resend`, {}),
    onSuccess: () => refetchInvites(),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => post(`/api/admin/agencies/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agencies'] });
      toast.success('Agency status updated.');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error?.message ?? 'Failed to update agency status');
    },
  });

  const requestToggle = (agency: Agency) => {
    if (agency.is_active) {
      if (!window.confirm(`Deactivate ${agency.name}? Operators under this agency may be affected until you re-enable it.`)) {
        return;
      }
    }
    toggleMutation.mutate(agency.id);
  };

  const openEdit = (agency: Agency) => {
    setEditingId(agency.id);
    setForm({ ...FORM_EMPTY, name: agency.name, state: agency.state || '' });
    setMode('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setForm(FORM_EMPTY); setCreateErr(null);
    setInvitePhone(''); setInviteResult(null); setMode('direct');
    setEditingId(null);
  };

  const filtered = agencies.filter(a =>
    (a.name.toLowerCase().includes(search.toLowerCase()) || (a.state || '').toLowerCase().includes(search.toLowerCase())) &&
    (!filterActive || a.is_active)
  ).sort((a, b) => { const v = a.name.localeCompare(b.name); return sortDesc ? -v : v; });

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const acceptedInvites = invites.filter(i => i.status === 'accepted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Active Operations</h2>
          <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: 14, marginTop: 4 }}>
            {agencies.length} agencies · {pendingInvites.length} pending invitations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Search agencies..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, width: 200, padding: '9px 14px' }}
          />
          <button onClick={() => setFilterActive(!filterActive)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: filterActive ? 'rgba(108,99,255,0.2)' : '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: filterActive ? '#6C63FF' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Filter size={13} /> {filterActive ? 'ACTIVE' : 'ALL'}
          </button>
          <button onClick={() => setSortDesc(!sortDesc)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <SortDesc size={13} /> {sortDesc ? 'Z-A' : 'A-Z'}
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#6C63FF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            <Plus size={13} /> ADD AGENCY
          </button>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {invites.length > 0 && (
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: showInvites ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <button
              onClick={() => setShowInvites(!showInvites)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
            >
              <Mail size={16} color="#6C63FF" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Invitation Management</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,122,0,0.15)', color: '#FF7A00', fontSize: 11, fontWeight: 800 }}>{pendingInvites.length} PENDING</span>
              {acceptedInvites.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontSize: 11, fontWeight: 800 }}>{acceptedInvites.length} ACCEPTED</span>}
              {showInvites ? <ChevronUp size={16} color="rgba(241,245,249,0.4)" /> : <ChevronDown size={16} color="rgba(241,245,249,0.4)" />}
            </button>
            
            {showInvites && (
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  placeholder="Filter invites..."
                  value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
                  style={{ ...INPUT, width: 160, padding: '6px 12px', fontSize: 12 }}
                />
                <select 
                  value={inviteStatusFilter} 
                  onChange={e => setInviteStatusFilter(e.target.value as any)}
                  style={{ ...INPUT, width: 110, padding: '6px 10px', fontSize: 11, fontWeight: 700, appearance: 'none', textAlign: 'center' }}
                >
                  <option value="all">ALL STATUS</option>
                  <option value="pending">PENDING</option>
                  <option value="accepted">ACCEPTED</option>
                </select>
              </div>
            )}
          </div>
          
          {showInvites && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invites
                .filter(i => 
                  (i.phone.includes(inviteSearch)) && 
                  (inviteStatusFilter === 'all' || i.status === inviteStatusFilter)
                )
                .map(inv => (
                  <InviteRow key={inv.id} invite={inv} onResend={(id) => resendMutation.mutate(id)} />
                ))
              }
              {invites.length > 0 && invites.filter(i => (i.phone.includes(inviteSearch)) && (inviteStatusFilter === 'all' || i.status === inviteStatusFilter)).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'rgba(241,245,249,0.3)', fontSize: 13 }}>No matching invitations found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Agencies Grid */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(241,245,249,0.4)' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <span>Synchronizing agency directory...</span>
        </div>
      ) : error ? (
        <div style={{ padding: 32, textAlign: 'center', background: '#1E293B', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }}>
          <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: 12 }}>Failed to load agencies</div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-agencies'] })} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>RETRY</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(241,245,249,0.4)' }}>
          {search ? `No agencies match "${search}"` : 'No agencies yet. Add one above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(a => (
            <AgencyCard 
              key={a.id} 
              agency={a}
              low={a.trips_remaining < 20}
              onToggle={requestToggle} 
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: 540, maxWidth: '94vw', background: '#1E293B', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 800 }}>{mode === 'edit' ? 'EDIT AGENCY' : 'ADD AGENCY'}</h3>
              <button onClick={closeModal} style={{ border: 'none', background: 'transparent', color: 'rgba(241,245,249,0.5)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Mode Tabs */}
            {mode !== 'edit' && (
              <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
                {([['direct', 'Direct Create', Building2], ['invite', 'Send Invite Link', Link2]] as const).map(([m, label, Icon]) => (
                  <button key={m} onClick={() => { setMode(m); setCreateErr(null); setInviteResult(null); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 8, border: `1px solid ${mode === m ? '#6C63FF' : 'rgba(255,255,255,0.07)'}`, background: mode === m ? 'rgba(108,99,255,0.15)' : 'transparent', color: mode === m ? '#6C63FF' : 'rgba(241,245,249,0.5)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: 24 }}>
              {mode !== 'invite' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(241,245,249,0.4)' }}>
                    {mode === 'edit'
                      ? 'Update basic agency information.'
                      : 'Create the agency and owner account immediately.'}
                  </p>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>Agency Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Metro Express Ltd." style={INPUT} />
                  </div>

                  {mode !== 'edit' && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>Owner Full Name *</label>
                        <input type="text" value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="e.g. Raj Patel" style={INPUT} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>Owner Phone *</label>
                        <input type="text" value={form.ownerPhone} onChange={e => setForm(p => ({ ...p, ownerPhone: e.target.value }))} placeholder="9XXXXXXXXX or +91XXXXXXXXXX" style={INPUT} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>Owner Email</label>
                        <input type="email" value={form.ownerEmail} onChange={e => setForm(p => ({ ...p, ownerEmail: e.target.value }))} placeholder="owner@agency.com (optional)" style={INPUT} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>Initial Password *</label>
                        <input type="password" value={form.ownerPassword} onChange={e => setForm(p => ({ ...p, ownerPassword: e.target.value }))} placeholder="Min 8 characters" style={INPUT} />
                      </div>
                    </>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>State / Region</label>
                    <input type="text" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="e.g. Gujarat" style={INPUT} />
                  </div>

                  {createErr && <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>{createErr}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={closeModal} style={BTN_GHOST}>CANCEL</button>
                    <button 
                      onClick={() => mode === 'edit' ? updateMutation.mutate(editingId!) : createMutation.mutate()} 
                      disabled={createMutation.isPending || updateMutation.isPending} 
                      style={{ ...BTN_PRIMARY, opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1 }}
                    >
                      {mode === 'edit' ? (updateMutation.isPending ? 'SAVING...' : 'SAVE CHANGES') : (createMutation.isPending ? 'CREATING...' : 'CREATE AGENCY')}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(241,245,249,0.4)' }}>
                    Send a secure invite link to the agency owner's phone. They'll use it to set up their agency and account themselves.
                  </p>
                  {!inviteResult ? (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.04em' }}>OWNER PHONE NUMBER *</label>
                        <input type="text" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="9XXXXXXXXX or +91XXXXXXXXXX" style={INPUT} />
                      </div>
                      {createErr && <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>{createErr}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={closeModal} style={BTN_GHOST}>CANCEL</button>
                        <button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !invitePhone} style={{ ...BTN_PRIMARY, opacity: (inviteMutation.isPending || !invitePhone) ? 0.6 : 1 }}>
                          {inviteMutation.isPending ? 'GENERATING...' : 'GENERATE INVITE'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <CheckCircle2 size={16} color="#22C55E" />
                          <span style={{ fontWeight: 700, color: '#22C55E', fontSize: 13 }}>Invite Link Generated!</span>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(241,245,249,0.7)', wordBreak: 'break-all', lineHeight: 1.6 }}>{inviteResult}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(241,245,249,0.4)' }}>
                        <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                        Valid for 7 days. Share this link with the agency owner via WhatsApp or SMS.
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { navigator.clipboard.writeText(inviteResult); }} style={{ ...BTN_GHOST, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Copy size={13} /> COPY LINK
                        </button>
                        <button onClick={closeModal} style={BTN_PRIMARY}>DONE</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
