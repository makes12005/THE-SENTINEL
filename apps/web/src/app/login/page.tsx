'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_REDIRECTS: Record<string, string> = {
  operator:  '/operator/dashboard',
  owner:     '/owner/dashboard',
  admin:     '/admin/dashboard',
  conductor: '/operator/dashboard',
  driver:    '/operator/dashboard',
};

/* ── OTP Login sub-form ─────────────────────────────────────────────────── */
function OtpLoginForm() {
  const router = useRouter();
  const login  = useAuthStore((s) => s.login);
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [step,    setStep]    = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);

  useEffect(() => {
    if (timer === 0) return;
    const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  async function sendOtp() {
    if (!phone) return toast.error('Enter your phone number');
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { phone });
      setStep('otp');
      setTimer(30);
      toast.success('OTP sent!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { phone, otp });
      const user = useAuthStore.getState().user;
      const role = user?.role ?? '';
      router.push(ROLE_REDIRECTS[role] ?? '/operator/dashboard');
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
            Phone Number
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
              <span className="material-symbols-outlined text-[18px]">phone</span>
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 (555) 000-0000"
              className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
              autoComplete="tel"
            />
          </div>
        </div>
        <button
          onClick={sendOtp}
          disabled={loading}
          className="w-full bg-[#a3cbf2] text-[#003353] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#003353]/30 border-t-[#003353] rounded-full animate-spin" />
              Sending OTP…
            </span>
          ) : 'Send OTP'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#8c9198]">OTP sent to <span className="text-[#a3cbf2] font-semibold">{phone}</span></p>
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          6-Digit OTP
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl px-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all text-center text-2xl tracking-[0.4em]"
        />
      </div>
      <button
        onClick={verifyOtp}
        disabled={loading}
        className="w-full bg-[#a3cbf2] text-[#003353] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-[#003353]/30 border-t-[#003353] rounded-full animate-spin" />
            Verifying…
          </span>
        ) : 'Verify & Login'}
      </button>
      <div className="text-center">
        {timer > 0 ? (
          <span className="text-xs text-[#8c9198]">Resend OTP in {timer}s</span>
        ) : (
          <button onClick={sendOtp} className="text-xs text-[#a3cbf2] hover:underline">
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Password Login sub-form ────────────────────────────────────────────── */
function PasswordLoginForm() {
  const router  = useRouter();
  const login   = useAuthStore((s) => s.login);
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showOtp,  setShowOtp]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) return toast.error('Enter phone and password');
    setLoading(true);
    try {
      await login(phone, password);
      const user = useAuthStore.getState().user;
      const role = user?.role ?? '';
      const dest = ROLE_REDIRECTS[role] ?? '/operator/dashboard';
      toast.success(`Welcome back, ${user?.name ?? 'User'}!`);
      router.push(dest);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  }

  if (showOtp) return <OtpLoginForm />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          Phone Number
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
            <span className="material-symbols-outlined text-[18px]">phone</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 (555) 000-0000"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            autoComplete="tel"
          />
        </div>
      </div>
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          Password
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            autoComplete="current-password"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#a3cbf2] text-[#003353] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-[#003353]/30 border-t-[#003353] rounded-full animate-spin" />
            Signing in…
          </span>
        ) : 'Login'}
      </button>
      <button
        type="button"
        onClick={() => setShowOtp(true)}
        className="w-full text-center text-sm font-semibold text-[#a3cbf2] hover:underline transition-all py-1"
      >
        Login with OTP
      </button>
    </form>
  );
}

/* ── Sign Up sub-form ───────────────────────────────────────────────────── */
function SignUpForm() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !password) return toast.error('Fill all fields');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, phone, password });
      // Store phone for OTP step
      sessionStorage.setItem('signup_phone', phone);
      await api.post('/api/auth/send-otp', { phone });
      toast.success('OTP sent to your phone!');
      router.push('/verify-otp?next=access-code');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          Full Name
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          Phone Number
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
            <span className="material-symbols-outlined text-[18px]">phone</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 (555) 000-0000"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            autoComplete="tel"
          />
        </div>
      </div>
      <div>
        <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
          Password
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
            autoComplete="new-password"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#a3cbf2] text-[#003353] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-[#003353]/30 border-t-[#003353] rounded-full animate-spin" />
            Creating account…
          </span>
        ) : 'Sign Up →'}
      </button>
    </form>
  );
}

/* ── Main Login Page ────────────────────────────────────────────────────── */
function LoginPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'login' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  );

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0b3c5d]/25 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to home */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#8c9198] hover:text-[#a3cbf2] transition-colors mb-8">
          <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-1">Welcome</h1>
          <p className="text-sm text-[#8c9198]">Access your transit control terminal.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#181c20] border border-[#42474e]/50 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              tab === 'login'
                ? 'bg-[#2a3038] text-[#a3cbf2] shadow-inner'
                : 'text-[#8c9198] hover:text-[#c2c7ce]'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              tab === 'signup'
                ? 'bg-[#2a3038] text-[#a3cbf2] shadow-inner'
                : 'text-[#8c9198] hover:text-[#c2c7ce]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form card */}
        <div className="bg-[#181c20] rounded-2xl p-8 border border-[#42474e]/30 shadow-2xl">
          {tab === 'login' ? <PasswordLoginForm /> : <SignUpForm />}
        </div>

        <p className="text-center text-xs text-[#8c9198] mt-6">
          Bus Alert System · Secure Operations Portal
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
