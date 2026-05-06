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
    <div className="bg-[#101418] min-h-screen flex flex-col font-body text-on-surface relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-48 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(163,203,242,0.03)_0%,transparent_100%)] pointer-events-none" />
      <header className="flex items-center px-8 py-6 w-full absolute top-0 z-50">
        <div className="font-headline font-bold text-primary tracking-widest uppercase text-sm">
          SENTINEL TRANSIT
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-6">
        <section className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-5">
          <h1 className="text-2xl font-black">Create password</h1>
          <input value={contact} readOnly className="w-full rounded-full bg-surface-container-high px-5 py-3" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-full bg-surface-container-high px-5 py-3 outline-none"
          />
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
          >
            {loading ? 'Sending OTP...' : 'Sign Up'}
          </button>
        </section>
      </main>
    </div>
  );
}
