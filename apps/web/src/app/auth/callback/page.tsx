'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuthStore } from '@/lib/auth-store';

const ROLE_REDIRECTS: Record<string, string> = {
  admin:     '/admin/dashboard',
  owner:     '/owner/dashboard',
  operator:  '/operator/dashboard',
  driver:    '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/login',   // passengers shouldn't be on web dashboard
};

/* ── Inner component — must be inside Suspense for useSearchParams ─────── */
function OAuthCallbackInner() {
  const router        = useRouter();
  const params        = useSearchParams();
  const { setSession } = useAuthStore();
  const processed     = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userRaw      = params.get('user');
    const error        = params.get('error');

    // ── Backend error case
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!accessToken || !userRaw) {
      router.replace('/login?error=oauth_callback_missing_params');
      return;
    }

    let user: {
      id: string;
      name: string;
      phone: string;
      role: string;
      agencyId: string | null;
    };

    try {
      user = JSON.parse(decodeURIComponent(userRaw));
    } catch {
      router.replace('/login?error=oauth_callback_parse_error');
      return;
    }

    // ── Persist in Zustand (same shape as normal login)
    setSession({
      accessToken,
      refreshToken: refreshToken ?? '',
      user: user as { id: string; name: string; phone: string; role: string; agencyId: string },
    });

    // ── Navigate to role-specific dashboard
    const dest = ROLE_REDIRECTS[user.role] ?? '/login';
    router.replace(dest);
  }, [params, setSession, router]);

  return (
    <div className="min-h-screen bg-[#13161b] flex flex-col items-center justify-center gap-4">
      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-[#1e2530]" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#a3cbf2] animate-spin"
        />
      </div>
      <p className="text-[#8b939f] text-sm font-medium tracking-wide">
        Signing you in&hellip;
      </p>
    </div>
  );
}

/* ── Page export (Suspense boundary required for useSearchParams) ─────── */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#13161b] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#1e2530] border-t-[#a3cbf2] animate-spin" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
