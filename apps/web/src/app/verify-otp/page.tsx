'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function VerifyOtpInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const nextRoute   = searchParams.get('next') ?? 'dashboard';

  const [phone,   setPhone]   = useState('');
  const [digits,  setDigits]  = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(30);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const p = sessionStorage.getItem('signup_phone') ?? '';
    setPhone(p);
  }, []);

  useEffect(() => {
    if (timer === 0) return;
    const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleDigit(index: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  }

  async function handleVerify() {
    const otp = digits.join('');
    if (otp.length < 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { phone, otp });
      toast.success('Phone verified!');
      if (nextRoute === 'access-code') {
        router.push('/access-code');
      } else {
        router.push('/operator/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (timer > 0) return;
    try {
      await api.post('/api/auth/send-otp', { phone });
      setTimer(30);
      setDigits(['', '', '', '', '', '']);
      toast.success('New OTP sent!');
    } catch {
      toast.error('Failed to resend OTP');
    }
  }

  const fmt = `0:${String(timer).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#0b3c5d]/25 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-[#8c9198] hover:text-[#a3cbf2] transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          Verify OTP
        </button>

        {/* Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#1a2a3a] border border-[#a3cbf2]/20 mb-6">
            <span className="material-symbols-outlined text-4xl text-[#a3cbf2]">shield_lock</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Enter Code</h1>
          <p className="text-sm text-[#8c9198]">
            Enter the 6-digit code sent to your phone.
          </p>
          {phone && (
            <p className="text-xs text-[#a3cbf2] mt-1">{phone}</p>
          )}
        </div>

        {/* OTP boxes */}
        <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all bg-[#1c2024] text-[#e0e2e8] focus:outline-none ${
                d
                  ? 'border-[#a3cbf2] ring-2 ring-[#a3cbf2]/30 text-[#a3cbf2]'
                  : 'border-[#42474e] focus:border-[#a3cbf2] focus:ring-2 focus:ring-[#a3cbf2]/30'
              }`}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || digits.join('').length < 6}
          className="w-full flex items-center justify-center gap-2 bg-[#e07b39] text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-5"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Verify <span className="material-symbols-outlined text-[18px]">chevron_right</span></>
          )}
        </button>

        {/* Timer & resend */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[#8c9198] text-sm">
            <span className="material-symbols-outlined text-[16px]">timer</span>
            <span className="font-mono font-bold text-[#a3cbf2]">{fmt}</span>
          </div>
          <button
            onClick={resendOtp}
            disabled={timer > 0}
            className={`text-xs font-semibold uppercase tracking-widest transition-all ${
              timer > 0 ? 'text-[#42474e] cursor-not-allowed' : 'text-[#a3cbf2] hover:underline'
            }`}
          >
            Resend OTP
          </button>
        </div>

        <p className="text-center text-[0.6rem] text-[#42474e] uppercase tracking-[0.2em] mt-12">
          Sentinel Secure Node V4.2.0
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
      <VerifyOtpInner />
    </Suspense>
  );
}
