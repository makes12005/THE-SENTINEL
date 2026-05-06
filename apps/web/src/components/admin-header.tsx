'use client';

import { Search, Bell, Settings, HelpCircle, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  title: string;
  showAddAgency?: boolean;
  onAddAgency?: () => void;
}

export default function AdminHeader({ title, showAddAgency, onAddAgency }: AdminHeaderProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    if (q.includes('agency')) return router.push('/admin/agencies');
    if (q.includes('trip') || q.includes('fleet')) return router.push('/admin/trips');
    if (q.includes('wallet') || q.includes('bill') || q.includes('credit')) return router.push('/admin/wallet');
    if (q.includes('audit') || q.includes('log') || q.includes('alert')) return router.push('/admin/audit');
    if (q.includes('health') || q.includes('system')) return router.push('/admin/health');
    router.push('/admin/dashboard');
  };

  return (
    <header style={{
      height: 72,
      padding: '0 32px',
      background: '#0F172A',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          {title}
        </h1>

        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-muted)' }} />
          <input 
            type="text" 
            placeholder="Search network..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            style={{
              width: '100%',
              background: '#1E293B',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px 12px 48px',
              color: '#fff',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {showAddAgency && (
          <button 
            onClick={() => {
              if (onAddAgency) onAddAgency();
              else router.push('/admin/agencies');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#0B3C5D',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(11, 60, 93, 0.3)'
            }}
          >
            <Plus size={16} /> ADD AGENCY
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid var(--color-border)', paddingLeft: 20 }}>
          <button onClick={() => router.push('/admin/audit')} title="Open alerts and audit logs" style={{ background: 'none', border: 'none', color: 'var(--color-on-surface-muted)', cursor: 'pointer', padding: 4 }}>
            <Bell size={20} />
          </button>
          <button onClick={() => router.push('/admin/health')} title="Open system health" style={{ background: 'none', border: 'none', color: 'var(--color-on-surface-muted)', cursor: 'pointer', padding: 4 }}>
            <Settings size={20} />
          </button>
          <button onClick={() => router.push('/admin/dashboard#feature-list')} title="Open admin feature list" style={{ background: 'none', border: 'none', color: 'var(--color-on-surface-muted)', cursor: 'pointer', padding: 4 }}>
            <HelpCircle size={20} />
          </button>
        </div>

        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', border: '2px solid #6C63FF', padding: 2 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {user?.name?.[0] ?? 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
