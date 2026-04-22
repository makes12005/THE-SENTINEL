'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AccessCodePage() {
  const router = useRouter();
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return toast.error('Enter your agency invite code');
    setLoading(true);
    try {
      await api.post('/api/auth/join-agency', { inviteCode: trimmed });
      toast.success('Agency linked successfully!');
      router.push('/operator/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    toast('Skipped — you can enter your agency code later from your profile.', { icon: 'ℹ️' });
    router.push('/operator/dashboard');
  }

  return (
    <div
      className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#0b3c5d]/25 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col" style={{ minHeight: '70vh' }}>
        {/* Icon */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#1a2a3a] border border-[#a3cbf2]/20 mb-6">
            <span className="material-symbols-outlined text-4xl text-[#a3cbf2]">terminal</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Enter Access Code</h1>
          <p className="text-sm text-[#8c9198] leading-relaxed">
            Enter the code provided by your agency<br />to sync your route profile.
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
            Agency Invite Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SENTINEL-XXXX"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-4 text-[#e0e2e8] placeholder-[#42474e] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all text-center text-lg font-mono tracking-[0.2em] uppercase"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#0b3c5d] hover:bg-[#0e4d7a] text-[#a3cbf2] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl border border-[#a3cbf2]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-[#a3cbf2]/30 border-t-[#a3cbf2] rounded-full animate-spin" />
          ) : (
            <>
              Continue
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>

        {/* Help text */}
        <p className="text-center text-xs text-[#8c9198] mb-4">
          Need help? Contact dispatch at{' '}
          <span className="text-[#a3cbf2] font-bold">#SENTINEL-SUPPORT</span>
        </p>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="w-full text-center text-sm font-semibold text-[#42474e] hover:text-[#8c9198] transition-colors py-2 mt-auto"
        >
          Skip for now →
        </button>

        <p className="text-center text-[0.6rem] text-[#42474e] uppercase tracking-[0.2em] mt-8">
          Unit 4021 Deployment
        </p>
      </div>
    </div>
  );
}
