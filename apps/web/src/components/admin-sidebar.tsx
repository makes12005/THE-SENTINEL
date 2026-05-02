'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, FileText, Activity,
  Settings, LogOut, HelpCircle, Bus, Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/admin/agencies', label: 'AGENCIES', icon: Building2 },
  { href: '/admin/trips', label: 'GLOBAL TRIPS', icon: Bus },
  { href: '/admin/audit', label: 'GLOBAL LOGS', icon: FileText },
  { href: '/admin/health', label: 'SYSTEM HEALTH', icon: Activity },
  { href: '/admin/wallet', label: 'WALLET', icon: Wallet },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside style={{
      width: 260,
      minHeight: '100vh',
      background: '#0B0D10',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand Header */}
      <div style={{ padding: '32px 24px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
          Velox Fleet Noir
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-on-surface-muted)', fontWeight: 600, letterSpacing: '0.1em', marginTop: 4 }}>
          TRANSIT OPERATIONS
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                background: active ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
                color: active ? '#6C63FF' : 'var(--color-on-surface-muted)',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.2s',
                borderLeft: active ? '3px solid #6C63FF' : '3px solid transparent'
              }}>
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div style={{ padding: '24px 16px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
          <Link href="/admin/health" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            color: 'var(--color-on-surface-muted)', fontSize: 12, fontWeight: 600, textDecoration: 'none'
          }}>
            <Settings size={18} /> SYSTEM HEALTH
          </Link>
          <Link href="/admin/dashboard#feature-list" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            color: 'var(--color-on-surface-muted)', fontSize: 12, fontWeight: 600, textDecoration: 'none'
          }}>
            <HelpCircle size={18} /> FEATURE LIST
          </Link>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            color: '#EF4444', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', width: '100%'
          }}>
            <LogOut size={18} /> LOGOUT
          </button>
        </div>

        {/* User Profile */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px', 
          background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ 
            width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff'
          }}>
            {user?.name?.[0] ?? 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Alex Mercer'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-on-surface-muted)', textTransform: 'capitalize' }}>
              {user?.role ?? 'Owner'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
