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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/* ── Google Sign-In Button ───────────────────────────────────────────────── */
function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  function handleGoogle() {
    // Redirect to backend Google OAuth — it will callback with JWT
    window.location.href = `${API_URL}/api/auth/google`;
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="w-full flex items-center justify-center gap-3 bg-[#1c2024] border border-[#42474e] hover:border-[#a3cbf2]/40 hover:bg-[#222830] text-[#e0e2e8] font-semibold text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
    >
      {/* Google G SVG */}
      <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M47.532 24.552c0-1.636-.146-3.2-.418-4.698H24.48v8.883h12.971c-.558 3.013-2.253 5.566-4.8 7.28v6.048h7.771c4.548-4.19 7.11-10.36 7.11-17.513z" fill="#4285F4"/>
        <path d="M24.48 48c6.51 0 11.97-2.16 15.96-5.835l-7.77-6.048c-2.158 1.449-4.915 2.305-8.19 2.305-6.296 0-11.63-4.252-13.537-9.967H2.897v6.24C6.87 42.933 15.093 48 24.48 48z" fill="#34A853"/>
        <path d="M10.943 28.455A14.476 14.476 0 0 1 10.11 24c0-1.565.27-3.084.833-4.455v-6.24H2.897A24.02 24.02 0 0 0 .48 24c0 3.882.927 7.553 2.417 10.695l8.046-6.24z" fill="#FBBC05"/>
        <path d="M24.48 9.578c3.546 0 6.727 1.22 9.23 3.616l6.922-6.922C36.447 2.386 30.99 0 24.48 0 15.093 0 6.87 5.067 2.897 13.305l8.046 6.24c1.906-5.716 7.24-9.967 13.537-9.967z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}

/* ── OR Divider ─────────────────────────────────────────────────────────── */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[#42474e]/60" />
      <span className="text-xs font-semibold text-[#42474e] uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-[#42474e]/60" />
    </div>
  );
}

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
          {/* Google OAuth — always visible in both tabs */}
          <GoogleButton label={tab === 'signup' ? 'Sign up with Google' : 'Continue with Google'} />
          <OrDivider />
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
