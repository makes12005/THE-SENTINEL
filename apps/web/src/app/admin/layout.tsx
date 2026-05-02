'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import AdminSidebar from '@/components/admin-sidebar';
import AdminHeader from '@/components/admin-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !token) { router.replace('/login'); return; }
    if (user.role !== 'admin') { router.replace('/login'); return; }
  }, [user, token, isHydrated, router]);

  if (!isHydrated || !user || !token || user.role !== 'admin') return null;

  // Derive title from pathname
  const getTitle = () => {
    if (pathname.includes('/dashboard')) return 'SYSTEM CONTROLLER';
    if (pathname.includes('/agencies')) return 'AGENCY PORTAL';
    if (pathname.includes('/audit')) return 'GLOBAL MONITORING';
    if (pathname.includes('/health')) return 'NETWORK HEALTH';
    if (pathname.includes('/wallet') || pathname.includes('/billing')) return 'PLATFORM BILLING';
    if (pathname.includes('/trips')) return 'GLOBAL FLEET MONITOR';
    return 'ADMIN CONSOLE';
  };

  const handleAddAgency = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:add-agency'));
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', color: '#F1F5F9' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminHeader 
          title={getTitle()} 
          showAddAgency={pathname === '/admin/agencies'}
          onAddAgency={pathname === '/admin/agencies' ? handleAddAgency : undefined}
        />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
