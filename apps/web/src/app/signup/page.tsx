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
    <main className="min-h-screen rugged-bg flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-5">
        <h1 className="text-2xl font-black">Create account</h1>
        <button
          type="button"
          onClick={continueWithGoogle}
          className="w-full rounded-2xl bg-surface-container-high py-3 font-bold"
        >
          Continue with Google
        </button>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email"
          className="w-full rounded-2xl bg-surface-container-high px-4 py-3 outline-none"
        />
        <button
          type="button"
          onClick={continueToPassword}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-on-primary"
        >
          Continue
        </button>
      </section>
    </main>
  );
}
