'use client';
/**
 * Owner layout — auth guard requiring role=owner (or admin).
 * Owners who try to access /operator/* are redirected here instead.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OwnerSidebar from '@/components/owner-sidebar';
import { useAuthStore } from '@/lib/auth-store';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const token  = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
      return;
    }
    // Block non-owner roles from this layout
    if (!['owner', 'admin'].includes(user.role)) {
      // Redirect operators back to their own dashboard
      if (user.role === 'operator') {
        router.push('/operator/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [token, user, router]);

  if (!token || !user) return null;

  return (
    <div className="flex min-h-screen bg-[#101418]">
      <OwnerSidebar />
      <main className="ml-64 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
