'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { type AuthUser, useAuthStore } from '@/lib/auth-store';
import { redirectPathForUser } from '@/lib/auth-redirect';

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
      phone?: string | null;
      email?: string | null;
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
    const normalizedUser: AuthUser = {
      id: user.id,
      name: user.name,
      phone: user.phone ?? null,
      email: user.email ?? null,
      role: user.role,
      agencyId: user.agencyId ?? null,
    };

    setSession({
      accessToken,
      refreshToken: refreshToken ?? '',
      user: normalizedUser,
    });

    // ── Navigate to role-specific dashboard
    const dest = redirectPathForUser(normalizedUser);
    router.replace(dest);
  }, [params, setSession, router]);

  return (
    <div className="min-h-screen bg-[#13161b] flex flex-col items-center justify-center gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-[#1e2530]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#a3cbf2] animate-spin" />
      </div>
      <p className="text-[#8b939f] text-sm font-medium tracking-wide">
        Signing you in&hellip;
      </p>
    </div>
  );
}

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
