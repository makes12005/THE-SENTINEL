'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normalizeContact(value: string): string {
  const trimmed = value.trim();
  if (isEmail(trimmed)) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return trimmed;
}

export default function SignupWelcomePage() {
  const router = useRouter();
  const [contact, setContact] = useState('');

  function continueToPassword() {
    if (!contact.trim()) {
      toast.error('Enter phone or email');
      return;
    }

    const normalized = normalizeContact(contact);
    sessionStorage.setItem('signup_contact', normalized);
    router.push('/signup/password');
  }

  function continueWithGoogle() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      toast.error('Google auth is unavailable right now');
      return;
    }
    window.location.href = `${baseUrl}/api/auth/google`;
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
          <h1 className="text-2xl font-black">Create account</h1>
          <button
            type="button"
            onClick={continueWithGoogle}
            className="w-full rounded-full bg-surface-container-high py-3 font-bold"
          >
            Continue with Google
          </button>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email"
            className="w-full rounded-full bg-surface-container-high px-5 py-3 outline-none"
          />
          <button
            type="button"
            onClick={continueToPassword}
            className="w-full rounded-full bg-primary py-3 font-bold text-on-primary"
          >
            Continue
          </button>
        </section>
      </main>
    </div>
  );
}
