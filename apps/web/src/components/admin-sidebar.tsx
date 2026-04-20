'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, CreditCard, Activity,
  ScrollText, ShieldCheck, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/agencies',  label: 'Agencies',    icon: Building2 },
  { href: '/admin/billing',   label: 'Billing',     icon: CreditCard },
  { href: '/admin/health',    label: 'System Health', icon: Activity },
  { href: '/admin/audit',     label: 'Audit Logs',  icon: ScrollText },
];

export default function AdminSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'linear-gradient(180deg, #0f0f1a 0%, #12121f 100%)',
      borderRight: '1px solid rgba(220,38,38,0.18)', display: 'flex', flexDirection: 'column',
      padding: '0 0 16px', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(220,38,38,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '0.02em' }}>Bus Alert</div>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
              background: active ? 'rgba(220,38,38,0.15)' : 'transparent',
              color: active ? '#ef4444' : '#9ca3af',
              fontSize: 13, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
              border: active ? '1px solid rgba(220,38,38,0.25)' : '1px solid transparent',
            }}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(220,38,38,0.12)' }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Signed in as</div>
        <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 600, marginBottom: 12 }}>{user?.name ?? 'Admin'}</div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)',
          background: 'rgba(220,38,38,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 13,
        }}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}
