'use client';
/**
 * Owner layout — auth guard requiring role=owner (or admin).
 * Owners who try to access /operator/* are redirected here instead.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OwnerSidebar from '@/components/owner-sidebar';
import { useAuthStore } from '@/lib/auth-store';

const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  owner: '/owner/dashboard',
  operator: '/operator/dashboard',
  driver: '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const token  = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
      return;
    }
    // Strict owner-only guard for /owner/*
    if (user.role !== 'owner') {
      router.push(ROLE_REDIRECTS[user.role] ?? '/login');
    }
  }, [token, user, router]);

  if (!token || !user || user.role !== 'owner') return null;

  return (
    <div className="flex min-h-screen bg-[#101418]">
      <OwnerSidebar />
      <main className="ml-64 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
