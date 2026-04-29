'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { redirectPathForRole, redirectPathForUser } from '@/lib/auth-redirect';

// ——————————————————————————————————————————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————————————————————————————————————————
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normalizeIdentifierForAuth(value: string): string {
  const trimmed = value.trim();
  if (isEmail(trimmed)) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return trimmed;
}

// ——————————————————————————————————————————————————————————————————————————————————————
// OTP Input Component
// ——————————————————————————————————————————————————————————————————————————————————————
function OtpInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const digits = value.padEnd(6, '').split('');

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const prev = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
      prev?.focus();
    }
  }

  function handleChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.slice(-1);
    if (char && !/\d/.test(char)) return;
    
    const arr = value.padEnd(6, '').split('');
    arr[idx] = char || '';
    const next = arr.join('').trim();
    onChange(next);

    if (char && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement;
      el?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length) {
      onChange(pasted);
      e.preventDefault();
    }
  }

  return (
    <div className="grid grid-cols-6 gap-3 mb-8" onPaste={handlePaste}>
      {[0,1,2,3,4,5].map((i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          autoComplete="one-time-code"
          className="w-full aspect-square text-center text-xl font-black rounded-2xl bg-surface-container-high border-2 border-transparent focus:border-primary focus:bg-surface-container-highest text-on-surface outline-none transition-all shadow-inner"
        />
      ))}
    </div>
  );
}

function TopAppBar() {
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-outline-variant/10 relative z-20 bg-background/50 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-on-primary text-2xl font-bold">shield</span>
        </div>
        <div>
          <h1 className="font-headline font-black text-lg tracking-tight text-on-surface">SENTINEL</h1>
          <p className="text-[10px] font-label font-bold tracking-[0.2em] text-on-surface-variant/60 uppercase">Transit Operations</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] font-label font-bold text-on-surface-variant/40 uppercase tracking-widest">Network Status</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Operational</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const { user, setSession } = useAuthStore();
  
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'enter' | 'verify'>('enter');

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    if (initialTab === 'signup') {
      router.replace('/signup');
      return;
    }
    else if (initialTab === 'login') setTab('login');
  }, [router]);

  useEffect(() => {
    if (user) {
      const redirect = redirectPathForUser(user);
      router.replace(redirect);
    }
  }, [user, router]);

  async function handleLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error('Authentication credentials required.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: any } }>('/api/auth/login', { 
        identifier: identifier.trim(), 
        password 
      });
      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      toast.success(`Access granted. Welcome, ${user?.name ?? 'Operator'}.`);
      router.push(user?.redirect ?? redirectPathForUser(user));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !identifier.trim() || !password.trim()) {
      toast.error('Incomplete registration data.');
      return;
    }
    setBusy(true);
    try {
      const normalizedIdentifier = normalizeIdentifierForAuth(identifier);
      const registerRes = await api.post<any>('/api/auth/register', { 
        name: name.trim(), 
        identifier: normalizedIdentifier, 
        password 
      });

      const accessToken = registerRes.data?.data?.accessToken ?? registerRes.data?.data?.access_token;
      const refreshToken = registerRes.data?.data?.refreshToken ?? registerRes.data?.data?.refresh_token;
      const userData = registerRes.data?.data?.user;
      
      if (accessToken && refreshToken && userData) {
        setSession({ accessToken, refreshToken, user: userData });
      }

      const otpRes = await api.post<any>('/api/auth/send-otp', { identifier: normalizedIdentifier });
      sessionStorage.setItem('auth_identifier', normalizedIdentifier);
      sessionStorage.setItem('auth_source', 'register');
      
      const devOtp = otpRes.data?.data?.otp;
      if (devOtp) toast(`Profile initialized. Dev OTP: ${devOtp}`, { icon: '🔑' });
      else toast.success('Profile initialized. Verification OTP sent.');
      
      router.push('/verify-otp?next=/profile-setup');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Identifier required for OTP challenge.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<any>('/api/auth/send-otp', { contact: identifier.trim() });
      const devOtp = res.data?.data?.otp;
      if (devOtp) toast(`OTP challenge initiated. Dev Code: ${devOtp}`, { icon: '🔑' });
      else toast.success('OTP challenge initiated. Check your terminal.');
      setOtpStep('verify');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Challenge initiation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Valid 6-digit code required.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<any>('/api/auth/login-otp', { contact: identifier.trim(), otp });
      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      toast.success(`Verification successful. Welcome, ${user?.name}.`);
      router.push(user?.redirect ?? redirectPathForUser(user));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Verification failed.');
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rugged-bg min-h-screen flex flex-col font-body text-on-surface overflow-x-hidden">
        <TopAppBar />

        <div className="flex-1 flex flex-col lg:flex-row relative z-10">
          {/* Left Sidebar - Visual Context */}
          <aside className="hidden lg:flex lg:w-[450px] border-r border-outline-variant/10 p-12 flex-col justify-between bg-surface-container-lowest/30 backdrop-blur-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase">Auth Protocol v4</span>
              </div>
              
              <h2 className="text-5xl font-headline font-black tracking-tighter leading-[0.9] mb-6">
                SECURE<br />TERMINAL<br /><span className="text-primary">ACCESS</span>
              </h2>
              
              <p className="text-on-surface-variant/70 text-lg leading-relaxed max-w-sm font-medium">
                Authorized personnel only. All access attempts are logged and monitored by Sentinel Intelligence.
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-surface-container-high/50 border border-outline-variant/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Security Level</p>
                    <p className="text-lg font-black text-on-surface">Tier 1 Certified</p>
                  </div>
                </div>
                <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-full bg-primary opacity-50"></div>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.3em]">
                  Sentinel © 2026
                </p>
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">terminal</span>
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">security</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
            <div className="w-full max-w-[420px]">
              <div className="mb-10 lg:hidden text-center">
                <h2 className="text-4xl font-headline font-black tracking-tight mb-2">Access Portal</h2>
                <p className="text-on-surface-variant font-medium uppercase tracking-[0.15em] text-[10px]">Sentinel Secure Gateway</p>
              </div>

              {/* Tabs */}
              <div className="bg-surface-container-lowest p-1.5 rounded-2xl flex mb-10 border border-outline-variant/10 shadow-xl">
                <button 
                  onClick={() => { setTab('login'); setMode('password'); }}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black tracking-[0.2em] transition-all uppercase ${tab === 'login' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  LOG IN
                </button>
                <button 
                  onClick={() => router.push('/signup')}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black tracking-[0.2em] transition-all uppercase ${tab === 'signup' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  SIGN UP
                </button>
              </div>

              <div className="space-y-6">
                {tab === 'signup' ? (
                  <form onSubmit={handleSignup} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Full Name</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">person</span>
                        <input 
                          required 
                          className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                          placeholder="EX: RAVI PATEL" 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value.toUpperCase())} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Identifier</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">contact_mail</span>
                        <input 
                          required 
                          className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                          placeholder="PHONE OR EMAIL" 
                          value={identifier} 
                          onChange={e => setIdentifier(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Access Password</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">lock</span>
                        <input 
                          required 
                          className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                          placeholder="MINIMUM 8 CHARS" 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      <button 
                        disabled={busy} 
                        type="submit" 
                        className="w-full bg-primary text-on-primary font-black text-sm py-5 rounded-2xl tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 uppercase disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {busy ? (
                          <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                        ) : (
                          <>
                            INITIALIZE PROFILE
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {mode === 'password' && (
                      <form onSubmit={handleLoginPassword} className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Identifier</label>
                          <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">account_circle</span>
                            <input 
                              required 
                              className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                              placeholder="PHONE OR EMAIL" 
                              value={identifier} 
                              onChange={e => setIdentifier(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Password</label>
                          <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">key</span>
                            <input 
                              required 
                              className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                              placeholder="••••••••" 
                              type="password" 
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="pt-4">
                          <button 
                            disabled={busy} 
                            type="submit" 
                            className="w-full bg-primary text-on-primary font-black text-sm py-5 rounded-2xl tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 uppercase disabled:opacity-50 flex items-center justify-center gap-3"
                          >
                            {busy ? (
                              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                            ) : (
                              <>
                                AUTHORIZE ACCESS
                                <span className="material-symbols-outlined text-[18px]">verified</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-center pt-4">
                          <button type="button" onClick={() => setMode('otp')} className="text-[10px] font-black text-primary hover:opacity-70 transition-all uppercase tracking-[0.25em]">
                            Login with OTP
                          </button>
                        </div>
                      </form>
                    )}

                    {mode === 'otp' && otpStep === 'enter' && (
                      <form onSubmit={handleSendOtp} className="space-y-5 animate-in fade-in duration-300">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-4">Identifier</label>
                          <input 
                            required 
                            className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-4.5 px-6 text-on-surface placeholder:text-on-surface-variant/30 font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all" 
                            placeholder="PHONE OR EMAIL" 
                            value={identifier} 
                            onChange={e => setIdentifier(e.target.value)} 
                          />
                        </div>
                        <div className="pt-4">
                          <button 
                            disabled={busy} 
                            type="submit" 
                            className="w-full bg-primary text-on-primary font-black text-sm py-5 rounded-2xl tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 uppercase flex items-center justify-center gap-3"
                          >
                            {busy ? (
                              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                            ) : (
                              'INITIATE CHALLENGE'
                            )}
                          </button>
                        </div>
                        <div className="text-center pt-4">
                          <button type="button" onClick={() => setMode('password')} className="text-[10px] font-black text-on-surface-variant/60 hover:text-on-surface transition-all uppercase tracking-[0.25em]">
                            Return to Password
                          </button>
                        </div>
                      </form>
                    )}

                    {mode === 'otp' && otpStep === 'verify' && (
                      <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-8">
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] mb-2">Verification Code Sent</p>
                          <p className="font-bold text-primary tracking-wide">{identifier}</p>
                        </div>
                        <OtpInput value={otp} onChange={setOtp} />
                        <div className="pt-4">
                          <button 
                            disabled={busy || otp.length < 6} 
                            type="submit" 
                            className="w-full bg-primary text-on-primary font-black text-sm py-5 rounded-2xl tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 uppercase flex items-center justify-center gap-3"
                          >
                            {busy ? 'VERIFYING...' : 'VALIDATE OTP'}
                          </button>
                        </div>
                        <div className="text-center pt-4">
                          <button type="button" onClick={() => { setOtpStep('enter'); setOtp(''); }} className="text-[10px] font-black text-on-surface-variant/60 hover:text-on-surface transition-all uppercase tracking-[0.25em]">
                            ← REISSUE CHALLENGE
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 py-8">
                  <div className="flex-1 h-[1px] bg-outline-variant/10"></div>
                  <span className="text-[10px] font-black text-on-surface-variant/30 tracking-[0.4em] uppercase">Gateway</span>
                  <div className="flex-1 h-[1px] bg-outline-variant/10"></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
                    if (!baseUrl) {
                      toast.error('Google auth is unavailable right now');
                      return;
                    }
                    window.location.href = `${baseUrl}/api/auth/google`;
                  }}
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest transition-all border border-outline-variant/5 py-4.5 rounded-2xl flex items-center justify-center gap-4 font-black text-[10px] tracking-[0.25em] text-on-surface-variant uppercase group shadow-lg"
                >
                  <img alt="Google" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEhMhAS14snMCqgSGt_2gerPVe3WBk6jPpGQ2U9vHPct7gwHzK7f6o22qb-biLlAuFbq77_Xdr2vmPtZYDdltLqcPEFBp1W3_9PN348-b_NrkLDeRjOSR0IAuzz-0GrED78PzxpDZwZ4cJSy0fw_ICSU8Pj4Tm0rVXiYXGCbckBjxTYGq8el4rT5ljYPFDa7d5cPZ95U7Dwzu3Sr_iIFybmdxJOh8h7B9TOmXzmSmcAbXlH1D-Q70SZyd5ZwHXn-lkE3K8U4AKylZG" />
                  Continue via Google
                </button>
              </div>

              <footer className="mt-12 text-center text-on-surface-variant/30 font-label text-[10px] tracking-[0.3em] uppercase">
                Sentinel Secure Node v4.2.0
              </footer>
            </div>
          </main>
        </div>

      </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
