'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function classifyIdentifier(v: string): 'phone' | 'email' | 'unknown' {
  if (isEmail(v)) return 'email';
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 10) return 'phone';
  return 'unknown';
}

const ROLE_REDIRECTS: Record<string, string> = {
  admin:     '/admin/dashboard',
  owner:     '/owner/dashboard',
  operator:  '/operator/dashboard',
  driver:    '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose(): void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#0284c7';

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        padding: '12px 20px', borderRadius: 10, maxWidth: 380,
        color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        background: bg,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP boxes
// ─────────────────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const digits = value.padEnd(6, '').split('');

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = value.slice(0, idx === 0 ? 0 : idx - 1) + value.slice(idx + 1);
      onChange(next.slice(0, 6));
      if (idx > 0) {
        const prev = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
        prev?.focus();
      }
    }
  }

  function handleChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.slice(-1);
    if (!/\d/.test(char)) return;
    const arr = value.padEnd(6, '').split('');
    arr[idx] = char;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement;
      el?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length) { onChange(pasted); e.preventDefault(); }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d === ' ' ? '' : d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-none bg-surface-container-high text-on-surface focus:ring-2 focus:ring-primary/50 outline-none transition-all"
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'login' | 'signup';
type LoginMode = 'password' | 'otp';
type OtpStep = 'enter' | 'verify';

export default function LoginPage() {
  const router   = useRouter();
  const { user, setSession } = useAuthStore();
  
  const [tab, setTab]   = useState<Tab>('login');
  const [mode, setMode] = useState<LoginMode>('password');
  const [otpStep, setOtpStep] = useState<OtpStep>('enter');

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => setToast({ message, type }), []);

  // Already logged in → redirect
  useEffect(() => {
    if (user) {
      const redirect = ROLE_REDIRECTS[user.role] ?? '/access-code';
      router.replace(redirect);
    }
  }, [user, router]);

  async function handleLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showToast('Please enter your phone/email and password.', 'error'); return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: any } }>('/api/auth/login', { identifier: identifier.trim(), password });
      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      const redirect = user?.redirect ?? ROLE_REDIRECTS[user?.role] ?? '/access-code';
      showToast(`Welcome back, ${user?.name ?? 'User'}!`, 'success');
      router.push(redirect);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Login failed. Check your credentials.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !identifier.trim() || !password.trim()) {
      showToast('Please fill in all fields.', 'error'); return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error'); return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/register', { name: name.trim(), identifier: identifier.trim(), password });
      const otpRes = await api.post<{ success: boolean; data: { otp?: string; message: string } }>('/api/auth/send-otp', { identifier: identifier.trim() });
      sessionStorage.setItem('auth_identifier', identifier.trim());
      sessionStorage.setItem('auth_source', 'register');
      const devOtp = otpRes.data?.data?.otp;
      if (devOtp) showToast(`✅ Account created! Dev OTP: ${devOtp}`, 'info');
      else showToast('Account created! OTP sent.', 'success');
      router.push('/verify-otp?next=access-code');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Sign-up failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) { showToast('Enter your phone or email first.', 'error'); return; }
    setBusy(true);
    try {
      const res = await api.post<{ success: boolean; data: { otp?: string; message: string } }>('/api/auth/send-otp', { identifier: identifier.trim() });
      const devOtp = res.data?.data?.otp;
      if (devOtp) showToast(`Dev OTP: ${devOtp}`, 'info');
      else showToast('OTP sent! Check your phone or email.', 'success');
      setOtpStep('verify');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Could not send OTP. Try again.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { showToast('Enter the 6-digit OTP.', 'error'); return; }
    setBusy(true);
    try {
      const res = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: any } }>('/api/auth/verify-otp', { identifier: identifier.trim(), otp });
      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      const redirect = user?.redirect ?? ROLE_REDIRECTS[user?.role] ?? '/access-code';
      showToast(`Welcome, ${user?.name ?? 'User'}!`, 'success');
      router.push(redirect);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'OTP verification failed.';
      showToast(msg, 'error');
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-primary min-h-screen flex flex-col noise-bg relative overflow-hidden z-0">
      <main className="flex-grow pt-16 pb-12 px-6 max-w-md mx-auto w-full z-10 relative">
        {/* 1. Top: Welcome Header */}
        <div className="mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-primary-container text-on-primary-container flex items-center justify-center text-3xl shadow-lg shadow-primary-container/30">🚌</div>
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight mb-2">Welcome</h2>
          <p className="text-on-surface-variant font-medium">Access your transit control terminal.</p>
        </div>

        {/* 2. Login / Sign Up toggle */}
        <div className="bg-surface-container-lowest p-1.5 rounded-full flex mb-10 border border-outline-variant/30">
          <button 
            onClick={() => { setTab('login'); setMode('password'); }}
            className={`flex-1 py-3 px-4 rounded-full text-sm font-bold tracking-wider transition-all ${tab === 'login' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            LOGIN
          </button>
          <button 
            onClick={() => setTab('signup')}
            className={`flex-1 py-3 px-4 rounded-full text-sm font-bold tracking-wider transition-all ${tab === 'signup' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            SIGN UP
          </button>
        </div>

        {/* 3. Continue with Google */}
        <div className="mb-8">
          <button className="w-full bg-surface-container-high hover:bg-surface-variant transition-colors border-none py-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-on-surface">
            <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEhMhAS14snMCqgSGt_2gerPVe3WBk6jPpGQ2U9vHPct7gwHzK7f6o22qb-biLlAuFbq77_Xdr2vmPtZYDdltLqcPEFBp1W3_9PN348-b_NrkLDeRjOSR0IAuzz-0GrED78PzxpDZwZ4cJSy0fw_ICSU8Pj4Tm0rVXiYXGCbckBjxTYGq8el4rT5ljYPFDa7d5cPZ95U7Dwzu3Sr_iIFybmdxJOh8h7B9TOmXzmSmcAbXlH1D-Q70SZyd5ZwHXn-lkE3K8U4AKylZG" />
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-[1px] bg-surface-container-highest"></div>
          <span className="text-[0.6875rem] font-bold text-outline-variant tracking-widest uppercase">Or</span>
          <div className="flex-1 h-[1px] bg-surface-container-highest"></div>
        </div>

        {/* Auth Forms */}
        <div className="space-y-6">
          {tab === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Full Name</label>
                <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Ravi Patel" type="text" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Phone Number / Email</label>
                <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="+91 98765 43210 or you@example.com" value={identifier} onChange={e => setIdentifier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Password</label>
                <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="pt-2">
                <button disabled={busy} type="submit" className="w-full bg-primary-container text-on-primary-container font-black text-lg py-5 rounded-xl tracking-widest transition-all active:scale-95 shadow-xl shadow-black/40 uppercase disabled:opacity-50">
                  {busy ? 'CREATING...' : 'CREATE ACCOUNT'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {mode === 'password' && (
                <form onSubmit={handleLoginPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Phone Number / Email</label>
                    <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="+91 98765 43210 or you@example.com" value={identifier} onChange={e => setIdentifier(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Password</label>
                    <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <div className="pt-2">
                    <button disabled={busy} type="submit" className="w-full bg-primary-container text-on-primary-container font-black text-lg py-5 rounded-xl tracking-widest transition-all active:scale-95 shadow-xl shadow-black/40 uppercase disabled:opacity-50">
                      {busy ? 'LOGGING IN...' : 'LOGIN'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button type="button" onClick={() => setMode('otp')} className="text-sm font-bold text-primary hover:underline transition-colors uppercase tracking-wider">
                      Login with OTP
                    </button>
                  </div>
                </form>
              )}

              {mode === 'otp' && otpStep === 'enter' && (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[0.6875rem] font-bold tracking-[0.1em] text-on-surface-variant uppercase ml-1">Phone Number / Email</label>
                    <input required className="w-full bg-surface-container-high border-none rounded-xl py-4 px-4 text-on-surface placeholder:text-outline-variant font-medium focus:ring-2 focus:ring-primary/50 outline-none" placeholder="+91 98765 43210 or you@example.com" value={identifier} onChange={e => setIdentifier(e.target.value)} />
                  </div>
                  <div className="pt-2">
                    <button disabled={busy} type="submit" className="w-full bg-tertiary-container text-on-tertiary-container font-bold py-5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-tertiary-container/10 uppercase tracking-widest disabled:opacity-50">
                      {busy ? 'SENDING...' : 'SEND OTP'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button type="button" onClick={() => setMode('password')} className="text-sm font-bold text-primary hover:underline transition-colors uppercase tracking-wider">
                      Login with Password
                    </button>
                  </div>
                </form>
              )}

              {mode === 'otp' && otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <p className="text-center text-on-surface-variant font-medium text-sm">
                    OTP sent to <strong className="text-primary">{identifier}</strong>
                  </p>
                  <OtpInput value={otp} onChange={setOtp} />
                  <div className="pt-2">
                    <button disabled={busy || otp.length < 6} type="submit" className="w-full bg-primary-container text-on-primary-container font-black text-lg py-5 rounded-xl tracking-widest transition-all active:scale-95 shadow-xl shadow-black/40 uppercase disabled:opacity-50">
                      {busy ? 'VERIFYING...' : 'VERIFY & LOGIN'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button type="button" onClick={() => { setOtpStep('enter'); setOtp(''); }} className="text-sm font-bold text-outline hover:text-on-surface transition-colors uppercase tracking-wider">
                      ← Change Identifier
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      {/* Visual Polish: Gradient Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-5%] left-[-10%] w-80 h-80 bg-secondary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
