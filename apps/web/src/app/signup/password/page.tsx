'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function SignupPasswordPage() {
  const router = useRouter();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedContact = sessionStorage.getItem('signup_contact');
    if (!savedContact) {
      router.replace('/signup');
      return;
    }
    setContact(savedContact);
  }, [router]);

  async function handleSignUp() {
    if (!contact || !password.trim()) {
      toast.error('Contact and password are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { contact });
      sessionStorage.setItem('signup_password', password);
      sessionStorage.setItem('auth_identifier', contact);
      sessionStorage.setItem('auth_source', 'signup');
      toast.success('OTP sent successfully');
      router.push('/verify-otp?flow=signup&next=/signup/promo');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen rugged-bg flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-5">
        <h1 className="text-2xl font-black">Create password</h1>
        <input value={contact} readOnly className="w-full rounded-2xl bg-surface-container-high px-4 py-3" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-2xl bg-surface-container-high px-4 py-3 outline-none"
        />
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
        >
          {loading ? 'Sending OTP...' : 'Sign Up'}
        </button>
      </section>
    </main>
  );
}
