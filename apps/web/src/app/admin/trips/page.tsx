'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { 
  Bus, MapPin, Clock, Calendar, Users, 
  Search, Filter, ChevronRight, Loader2,
  CheckCircle2, Zap, Timer
} from 'lucide-react';
interface GlobalTrip {
  id: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  route_name: string;
  from_city: string;
  to_city: string;
  agency_name: string;
  operator_name: string;
}

export default function AdminGlobalTripsPage() {
  const [trips, setTrips] = useState<GlobalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<GlobalTrip[]>('/api/admin/trips', { status: filterStatus || undefined });
      setTrips(res);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Unable to load trips. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterStatus]);

  const filtered = trips.filter(t => 
    t.agency_name.toLowerCase().includes(search.toLowerCase()) ||
    t.route_name.toLowerCase().includes(search.toLowerCase()) ||
    t.from_city.toLowerCase().includes(search.toLowerCase()) ||
    t.to_city.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'scheduled': return '#6C63FF';
      case 'completed': return 'var(--color-on-surface-muted)';
      default: return '#fff';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap size={14} />;
      case 'scheduled': return <Calendar size={14} />;
      case 'completed': return <CheckCircle2 size={14} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {error && (
        <div style={{ padding: 32, textAlign: 'center', background: '#1E293B', border: '1px solid #EF4444', borderRadius: 12 }}>
          <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: 12 }}>{error}</div>
          <button onClick={load} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            RETRY
          </button>
        </div>
      )}
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Global Fleet Monitor</h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 14, marginTop: 4 }}>
            Tracking {trips.length} active and upcoming journeys across the network.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by agency or route..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: '#1E293B',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '10px 12px 10px 36px',
                color: '#fff',
                fontSize: 13,
                width: 280,
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', background: '#1E293B', borderRadius: 8, padding: 4, border: '1px solid var(--color-border)' }}>
            {[
              { id: '', label: 'ALL' },
              { id: 'active', label: 'LIVE' },
              { id: 'scheduled', label: 'UPCOMING' },
              { id: 'completed', label: 'PAST' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: filterStatus === tab.id ? 'var(--color-secondary)' : 'transparent',
                  color: filterStatus === tab.id ? '#fff' : 'var(--color-on-surface-muted)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 100, textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-secondary)" style={{ margin: '0 auto 20px' }} />
          <span style={{ color: 'var(--color-on-surface-muted)', fontSize: 14 }}>Fetching network-wide telemetry...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', background: '#1E293B', borderRadius: 16, border: '1px dashed var(--color-border)' }}>
              <Bus size={48} color="var(--color-on-surface-muted)" style={{ opacity: 0.3, margin: '0 auto 20px' }} />
              <h3 style={{ color: '#fff', margin: 0 }}>No matching trips found</h3>
              <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 13, marginTop: 8 }}>Try adjusting your filters or search query.</p>
            </div>
          ) : (
            filtered.map(trip => (
              <div 
                key={trip.id}
                style={{
                  background: '#1E293B',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px 180px 180px 40px',
                  alignItems: 'center',
                  gap: 24,
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Trip Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 40, height: 40, borderRadius: 10, background: 'rgba(108, 99, 255, 0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Bus size={20} color="var(--color-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{trip.route_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-on-surface-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> {trip.from_city} → {trip.to_city}
                    </div>
                  </div>
                </div>

                {/* Agency Info */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>AGENCY</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.agency_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', marginTop: 2 }}>{trip.operator_name}</div>
                </div>

                {/* Status */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>SYSTEM STATUS</div>
                  <div style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: 6, 
                    padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${getStatusColor(trip.status)}22`,
                    color: getStatusColor(trip.status),
                    fontSize: 11, fontWeight: 800
                  }}>
                    {getStatusIcon(trip.status)}
                    {trip.status.toUpperCase()}
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-on-surface-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>SCHEDULE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    <Calendar size={12} color="var(--color-on-surface-muted)" />
                    {new Date(trip.scheduled_date).toLocaleDateString()}
                  </div>
                  {trip.started_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22C55E', marginTop: 4 }}>
                      <Timer size={10} />
                      Started {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ChevronRight size={20} color="var(--color-on-surface-muted)" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
