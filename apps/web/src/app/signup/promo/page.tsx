'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPromoPage() {
  const router = useRouter();
  const [promoCode, setPromoCode] = useState(sessionStorage.getItem('signup_promo_code') ?? '');

  function continueFlow() {
    sessionStorage.setItem('signup_promo_code', promoCode.trim().toUpperCase());
    router.push('/signup/details');
  }

  function skipPromo() {
    sessionStorage.removeItem('signup_promo_code');
    router.push('/signup/details');
  }

  return (
    <main className="min-h-screen rugged-bg flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-5">
        <h1 className="text-2xl font-black">Promo / Agency code</h1>
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Enter code (optional)"
          className="w-full rounded-2xl bg-surface-container-high px-4 py-3 outline-none"
        />
        <button
          type="button"
          onClick={continueFlow}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-on-primary"
        >
          Continue
        </button>
        <button type="button" onClick={skipPromo} className="w-full py-2 text-sm font-bold text-on-surface-variant">
          Skip
        </button>
      </section>
    </main>
  );
}
