'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format-ist';
import { 
  Bus, Users, MapPin, Clock, Calendar, ChevronLeft,
  Loader2, AlertTriangle, Zap, CheckCircle2, Timer,
  Phone, User, Activity, Download, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TripPassenger {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  stop_name?: string;
  alert_status: string;
  alert_sent_at?: string | null;
}

interface TripOperator {
  id: string;
  name: string;
  phone?: string;
}

interface TripRoute {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
}

interface TripDetail {
  id: string;
  status: 'scheduled' | 'active' | 'completed' | 'expired';
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  bus_number?: string;
  route: TripRoute;
  conductor?: TripOperator;
  driver?: TripOperator;
  assigned_operator?: TripOperator;
  trip_owner_operator?: TripOperator;
  agency?: { id: string; name: string; };
  passengers: TripPassenger[];
}

function DeleteModal({ tripId, onConfirm, onClose, isDeleting }: { tripId: string; onConfirm: () => void; onClose: () => void; isDeleting: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', maxWidth: 420, width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Delete Trip</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-muted)', margin: 0 }}>
            Are you sure you want to delete this trip? This action cannot be undone.
          </p>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#EF4444', letterSpacing: '0.1em', marginBottom: 8 }}>WARNING</div>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', margin: 0 }}>
              All passenger data, alert logs, and trip history will be permanently removed from the system.
            </p>
          </div>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1 }}
          >
            CANCEL
          </button>
          <button 
            onClick={onConfirm}
            disabled={isDeleting}
            style={{ padding: '10px 20px', background: '#EF4444', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: isDeleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            {isDeleting ? 'DELETING...' : 'DELETE TRIP'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</div>
    </div>
  );
}

export default function AdminTripDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: trip, isLoading, error } = useQuery<TripDetail>({
    queryKey: ['admin-trip-detail', id],
    queryFn: () => get<TripDetail>(`/api/trips/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: passengers } = useQuery<TripPassenger[]>({
    queryKey: ['trip-passengers', id],
    queryFn: () => get<TripPassenger[]>(`/api/trips/${id}/passengers`),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/api/trips/${id}`),
    onSuccess: () => {
      toast.success('Trip deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin-trips'] });
      router.push('/admin/trips');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to delete trip';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-secondary)" />
        <p style={{ marginTop: 16, color: 'var(--color-on-surface-muted)', fontSize: 14 }}>Retrieving trip telemetry...</p>
      </div>
    );
  }

  if (error || !trip) {
    const errObj = error as any;
    const status = errObj?.response?.status;
    const msg = errObj?.response?.data?.error?.message ?? errObj?.message ?? 'Unknown error';
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="var(--color-accent)" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ color: '#fff' }}>Load Failed</h2>
        <p style={{ color: 'var(--color-on-surface-muted)', marginBottom: 8, maxWidth: 480, margin: '0 auto 8px' }}>
          {status === 404 ? 'Trip not found in system registry' : `Failed to load trip: ${msg} (${status ?? 'network error'})`}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#EF4444', marginBottom: 24 }}>ID: {id}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 20px', background: 'var(--color-secondary)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>GO BACK</button>
      </div>
    );
  }

  const alertSent = passengers?.filter((p) => p.alert_status === 'sent').length ?? 0;
  const alertFailed = passengers?.filter((p) => p.alert_status === 'failed').length ?? 0;
  const alertPending = passengers?.filter((p) => p.alert_status === 'pending').length ?? 0;
  const total = passengers?.length ?? 0;
  const deliveryPct = total ? Math.round((alertSent / total) * 100) : 0;
  
  const canDelete = trip.status === 'scheduled' || trip.status === 'expired';
  const isExpired = trip.status === 'expired' || (trip.status === 'scheduled' && new Date(trip.scheduled_date) < new Date());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'scheduled': return '#6C63FF';
      case 'expired': return '#EF4444';
      case 'completed': return 'var(--color-on-surface-muted)';
      default: return '#fff';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap size={14} />;
      case 'scheduled': return <Calendar size={14} />;
      case 'expired': return <AlertTriangle size={14} />;
      case 'completed': return <CheckCircle2 size={14} />;
      default: return null;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return 'rgba(34, 197, 94, 0.1)';
      case 'scheduled': return 'rgba(108, 99, 255, 0.1)';
      case 'expired': return 'rgba(239, 68, 68, 0.1)';
      case 'completed': return 'rgba(255, 255, 255, 0.03)';
      default: return 'transparent';
    }
  };

  const getPassengerStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#22C55E';
      case 'failed': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return 'var(--color-on-surface-muted)';
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    return `${phone.slice(0, 3)}XXXXX${phone.slice(-5)}`;
  };

  const exportManifest = () => {
    if (!passengers) return;
    const csvContent = [
      ['Name', 'Phone', 'Stop', 'Alert Status', 'Sent At'].join(','),
      ...passengers.map(p => [p.passenger_name, p.passenger_phone, p.stop_name || '', p.alert_status, p.alert_sent_at ? new Date(p.alert_sent_at).toLocaleString() : ''].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip_${id}_manifest.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/admin/trips')} style={{ padding: 8, background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>TRIPS</span>
              <span style={{ color: 'var(--color-border)' }}>›</span>
              <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>{id.slice(0, 8)}</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
              {trip.route?.from_city} <span style={{ color: 'var(--color-secondary)' }}>→</span> {trip.route?.to_city}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--color-on-surface-muted)' }}>{trip.route?.name}</span>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-border)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>{trip.agency?.name || 'Unknown Agency'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {canDelete && (
            <button onClick={() => setShowDeleteModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              <Trash2 size={14} /> DELETE
            </button>
          )}
          <button onClick={exportManifest} disabled={!passengers || passengers.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#1E293B', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: passengers?.length ? 'pointer' : 'not-allowed', opacity: passengers?.length ? 1 : 0.5 }}>
            <Download size={14} /> EXPORT
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: getStatusBgColor(trip.status), border: `1px solid ${getStatusColor(trip.status)}44` }}>
            <span style={{ color: getStatusColor(trip.status) }}>{getStatusIcon(trip.status)}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: getStatusColor(trip.status), letterSpacing: '0.05em' }}>{trip.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Expired Warning */}
      {isExpired && trip.status !== 'completed' && (
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>Trip Schedule Passed</div>
            <div style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>This trip was scheduled for {trip.scheduled_date} but has not started yet. Consider deleting or updating the schedule.</div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Top Stats */}
          <div style={{ display: 'flex', gap: 20 }}>
            <StatBox label="TOTAL PASSENGERS" value={total} icon={Users} color="var(--color-primary)" />
            <StatBox label="ALERTS DELIVERED" value={alertSent} icon={CheckCircle2} color="#22C55E" />
            <StatBox label="ALERTS FAILED" value={alertFailed} icon={AlertTriangle} color="var(--color-accent)" />
          </div>

          {/* Trip Intelligence Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Route Panel */}
            <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <MapPin size={18} color="var(--color-secondary)" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>ROUTE INTELLIGENCE</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Bus size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>ROUTE NAME</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{trip.route?.name || '—'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><MapPin size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>ORIGIN</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{trip.route?.from_city || '—'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><MapPin size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>DESTINATION</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{trip.route?.to_city || '—'}</div></div>
                </div>
                {trip.bus_number && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Bus size={16} color="var(--color-on-surface-muted)" /></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>BUS NUMBER</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{trip.bus_number}</div></div>
                  </div>
                )}
              </div>
            </div>

            {/* Timing Panel */}
            <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Clock size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.05em' }}>SCHEDULE TIMELINE</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Calendar size={16} color={isExpired ? '#EF4444' : 'var(--color-on-surface-muted)'} /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>SCHEDULED DATE</div><div style={{ fontSize: 14, fontWeight: 700, color: isExpired ? '#EF4444' : '#fff' }}>{trip.scheduled_date}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Timer size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>STARTED AT (IST)</div><div style={{ fontSize: 14, fontWeight: 700, color: trip.started_at ? '#22C55E' : 'var(--color-on-surface-muted)' }}>{trip.started_at ? formatIstDateTime(trip.started_at) : 'Not started'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><CheckCircle2 size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>COMPLETED AT (IST)</div><div style={{ fontSize: 14, fontWeight: 700, color: trip.completed_at ? '#22C55E' : 'var(--color-on-surface-muted)' }}>{trip.completed_at ? formatIstDateTime(trip.completed_at) : 'Not completed'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}><Activity size={16} color="var(--color-on-surface-muted)" /></div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>CREATED AT</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{formatIstDateTime(trip.created_at)}</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Passengers Table */}
          <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>DEPLOYMENT MANIFEST</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>Passengers ({total})</h3>
              </div>
              {alertFailed > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-accent)', fontSize: 11, fontWeight: 800 }}>
                  <AlertTriangle size={14} />{alertFailed} Failed
                </div>
              )}
            </div>
            {total === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Users size={48} color="var(--color-on-surface-muted)" style={{ opacity: 0.3, margin: '0 auto 20px' }} />
                <h3 style={{ color: '#fff', margin: 0 }}>No passengers found</h3>
                <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 13, marginTop: 8 }}>This trip has no passengers assigned yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>NAME</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>PHONE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>STOP</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em' }}>SENT AT (IST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengers?.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.passenger_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-on-surface-muted)', fontFamily: 'monospace' }}>{maskPhone(p.passenger_phone)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-on-surface-muted)' }}>{p.stop_name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: `${getPassengerStatusColor(p.alert_status)}15`, border: `1px solid ${getPassengerStatusColor(p.alert_status)}44`, fontSize: 10, fontWeight: 800, color: getPassengerStatusColor(p.alert_status), letterSpacing: '0.05em' }}>
                            {p.alert_status === 'sent' && <CheckCircle2 size={12} />}
                            {p.alert_status === 'failed' && <AlertTriangle size={12} />}
                            {p.alert_status === 'pending' && <Clock size={12} />}
                            {p.alert_status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-on-surface-muted)' }}>{p.alert_sent_at ? formatIstDateTime(p.alert_sent_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Alert Delivery Progress */}
          {total > 0 && (
            <div style={{ background: '#0B0D10', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '0 0 20px', letterSpacing: '0.1em' }}>ALERT DELIVERY</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1c2024" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#4ade80" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - deliveryPct / 100)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{deliveryPct}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} /><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>Sent: <span style={{ color: '#22C55E' }}>{alertSent}</span></span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>Pending: <span style={{ color: '#F59E0B' }}>{alertPending}</span></span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-muted)' }}>Failed: <span style={{ color: '#EF4444' }}>{alertFailed}</span></span></div>
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${deliveryPct}%`, background: '#4ade80', borderRadius: 2, transition: 'width 0.7s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--color-on-surface-muted)' }}>{alertSent} / {total} delivered</span>
              </div>
            </div>
          )}

          {/* Crew Panel */}
          {(trip.conductor || trip.driver || trip.assigned_operator || trip.trip_owner_operator) && (
            <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '0.1em' }}>ASSIGNED CREW</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trip.conductor && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--color-secondary)" /></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.conductor.name}</div><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={10} color="var(--color-on-surface-muted)" /><span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontFamily: 'monospace' }}>{trip.conductor.phone || '—'}</span></div></div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-secondary)', background: 'rgba(108, 99, 255, 0.1)', padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>CONDUCTOR</span>
                  </div>
                )}
                {trip.driver && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--color-secondary)" /></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.driver.name}</div><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={10} color="var(--color-on-surface-muted)" /><span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontFamily: 'monospace' }}>{trip.driver.phone || '—'}</span></div></div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>DRIVER</span>
                  </div>
                )}
                {trip.assigned_operator && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--color-secondary)" /></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.assigned_operator.name}</div><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={10} color="var(--color-on-surface-muted)" /><span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontFamily: 'monospace' }}>{trip.assigned_operator.phone || '—'}</span></div></div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#22C55E', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>OPERATOR</span>
                  </div>
                )}
                {trip.trip_owner_operator && trip.trip_owner_operator.id !== trip.assigned_operator?.id && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--color-secondary)" /></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.trip_owner_operator.name}</div><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={10} color="var(--color-on-surface-muted)" /><span style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', fontFamily: 'monospace' }}>{trip.trip_owner_operator.phone || '—'}</span></div></div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-on-surface-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>OWNER</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ background: '#1E293B', borderRadius: 16, border: '1px solid var(--color-border)', padding: '24px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '0.1em' }}>QUICK ACTIONS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trip.agency?.id && (
                <button onClick={() => router.push(`/admin/agencies/${trip.agency?.id}`)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>VIEW AGENCY</button>
              )}
              <button onClick={() => router.push('/admin/trips')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>BACK TO ALL TRIPS</button>
              <button onClick={() => router.push('/admin/audit')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>VIEW AUDIT STREAM</button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal tripId={id} onConfirm={() => deleteMutation.mutate()} onClose={() => setShowDeleteModal(false)} isDeleting={deleteMutation.isPending} />
      )}
    </div>
  );
}
