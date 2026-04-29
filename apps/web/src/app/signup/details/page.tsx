'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { redirectPathForRole } from '@/lib/auth-redirect';

export default function SignupDetailsPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function completeSignup(skipDetails: boolean) {
    const contact = sessionStorage.getItem('signup_contact') ?? '';
    const password = sessionStorage.getItem('signup_password') ?? '';
    const tempToken = sessionStorage.getItem('signup_temp_token') ?? '';
    const promoCode = sessionStorage.getItem('signup_promo_code') ?? '';

    if (!contact || !password || !tempToken) {
      toast.error('Signup session expired. Please start again.');
      router.replace('/signup');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: {
          access_token?: string;
          accessToken?: string;
          refresh_token?: string;
          refreshToken?: string;
          user: any;
        };
      }>('/api/auth/signup', {
        name: skipDetails || !name.trim() ? 'Bus Alert User' : name.trim(),
        contact,
        password,
        temp_token: tempToken,
        agency_invite_code: promoCode || undefined,
      });

      const data = res.data.data;
      const accessToken = data.accessToken ?? data.access_token;
      const refreshToken = data.refreshToken ?? data.refresh_token;
      if (!accessToken || !refreshToken || !data.user) {
        throw new Error('Missing auth tokens');
      }

      setSession({ accessToken, refreshToken, user: data.user });
      ['signup_contact', 'signup_password', 'signup_temp_token', 'signup_promo_code', 'auth_identifier', 'auth_source'].forEach((k) =>
        sessionStorage.removeItem(k)
      );
      router.replace(redirectPathForRole(data.user?.role));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to complete signup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen rugged-bg flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-5">
        <h1 className="text-2xl font-black">Additional details</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name (optional)"
          className="w-full rounded-2xl bg-surface-container-high px-4 py-3 outline-none"
        />
        <button
          type="button"
          onClick={() => completeSignup(false)}
          disabled={loading}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
        >
          Complete
        </button>
        <button type="button" onClick={() => completeSignup(true)} className="w-full py-2 text-sm font-bold text-on-surface-variant">
          Skip
        </button>
      </section>
    </main>
  );
}
