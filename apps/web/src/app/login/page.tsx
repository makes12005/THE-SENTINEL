'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { redirectPathForUser } from '@/lib/auth-redirect';

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

function LoginPageInner() {
  const router = useRouter();
  const { user, setSession } = useAuthStore();
  
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [mode, setMode] = useState<'password' | 'otp'>('password');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    if (initialTab === 'signup') {
      setTab('signup');
    }
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
    if (!identifier.trim() || !password.trim()) {
      toast.error('Incomplete registration data.');
      return;
    }
    setBusy(true);
    try {
      const normalizedIdentifier = normalizeIdentifierForAuth(identifier);
      const registerRes = await api.post<any>('/api/auth/register', { 
        name: 'New User', 
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
      sessionStorage.setItem('auth_identifier', identifier.trim());
      if (devOtp) toast(`OTP challenge initiated. Dev Code: ${devOtp}`, { icon: '🔑' });
      else toast.success('OTP challenge initiated.');
      router.push('/verify-otp');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Challenge initiation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#101418] min-h-screen flex flex-col font-body text-on-surface relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-0 inset-x-0 h-full w-full pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(163, 203, 242, 0.03) 0%, transparent 100%)'
      }} />

      <header className="flex items-center justify-between px-8 py-6 w-full absolute top-0 z-50">
        <div className="font-headline font-bold text-primary tracking-widest uppercase text-sm">
          SENTINEL TRANSIT
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold tracking-[0.05em] text-outline-variant">
          <button className="hover:text-on-surface transition-colors">System Status</button>
          <button className="hover:text-on-surface transition-colors">Help Center</button>
        </div>
        <div className="flex gap-4 text-primary">
          <button className="material-symbols-outlined hover:opacity-80 transition-opacity text-[1.25rem]" style={{ fontVariationSettings: "'FILL' 0" }}>language</button>
          <button className="material-symbols-outlined hover:opacity-80 transition-opacity text-[1.25rem]" style={{ fontVariationSettings: "'FILL' 0" }}>settings</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-6">
        <div className="mb-10 text-center">
          <h1 className="font-headline font-extrabold text-[2.5rem] text-on-surface tracking-tight mb-2">Welcome</h1>
          <p className="text-on-surface-variant font-medium text-[0.95rem]">Access your transit control terminal.</p>
        </div>
        
        <div className="w-full max-w-[420px] bg-surface-container rounded-[1.5rem] p-6 sm:p-8 border border-white/[0.02]">
          {/* Tabs */}
          <div className="bg-surface-container-lowest p-1.5 rounded-full flex mb-8">
            <button 
              onClick={() => { setTab('login'); setMode('password'); }}
              className={`flex-1 py-3 px-4 rounded-full text-xs font-bold tracking-wider transition-all ${tab === 'login' ? 'bg-surface-bright text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setTab('signup')}
              className={`flex-1 py-3 px-4 rounded-full text-xs font-bold tracking-wider transition-all ${tab === 'signup' ? 'bg-surface-bright text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Sign Up
            </button>
          </div>

          <button 
            type="button"
            onClick={() => {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL;
              if (!baseUrl) return toast.error('Google auth unavailable');
              window.location.href = `${baseUrl}/api/auth/google`;
            }}
            className="w-full bg-surface-container-high hover:bg-surface-container-highest transition-colors py-3.5 rounded-xl flex items-center justify-center gap-3 text-sm font-bold text-on-surface mb-6 border border-white/[0.03]"
          >
            <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEhMhAS14snMCqgSGt_2gerPVe3WBk6jPpGQ2U9vHPct7gwHzK7f6o22qb-biLlAuFbq77_Xdr2vmPtZYDdltLqcPEFBp1W3_9PN348-b_NrkLDeRjOSR0IAuzz-0GrED78PzxpDZwZ4cJSy0fw_ICSU8Pj4Tm0rVXiYXGCbckBjxTYGq8el4rT5ljYPFDa7d5cPZ95U7Dwzu3Sr_iIFybmdxJOh8h7B9TOmXzmSmcAbXlH1D-Q70SZyd5ZwHXn-lkE3K8U4AKylZG"/>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[1px] bg-surface-container-highest"></div>
            <span className="text-[0.65rem] font-bold text-outline-variant tracking-widest uppercase">OR</span>
            <div className="flex-1 h-[1px] bg-surface-container-highest"></div>
          </div>

          {mode === 'password' ? (
            <form onSubmit={tab === 'login' ? handleLoginPassword : handleSignup} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[0.65rem] font-bold tracking-[0.1em] text-outline-variant uppercase ml-1">Phone Number</label>
                <div className="relative flex items-center">
                   <input 
                     required
                     className="w-full bg-surface-container-lowest border border-transparent focus:border-primary/30 rounded-xl py-3.5 pl-4 pr-12 text-sm text-on-surface placeholder:text-outline-variant/50 font-medium outline-none transition-all" 
                     placeholder="+1 (555) 000-0000" 
                     type="tel"
                     value={identifier}
                     onChange={e => setIdentifier(e.target.value)}
                   />
                   <span className="material-symbols-outlined absolute right-4 text-outline-variant text-[1.1rem]">call</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-[0.65rem] font-bold tracking-[0.1em] text-outline-variant uppercase">Password</label>
                  {tab === 'login' && <button type="button" className="text-[0.65rem] font-bold tracking-[0.1em] text-primary uppercase hover:underline">Forgot?</button>}
                </div>
                <div className="relative flex items-center">
                   <input 
                     required
                     className="w-full bg-surface-container-lowest border border-transparent focus:border-primary/30 rounded-xl py-3.5 pl-4 pr-12 text-sm text-on-surface placeholder:text-outline-variant/50 font-medium outline-none transition-all tracking-widest" 
                     placeholder="••••••••••••" 
                     type="password"
                     value={password}
                     onChange={e => setPassword(e.target.value)}
                   />
                   <span className="material-symbols-outlined absolute right-4 text-outline-variant text-[1.1rem]">lock</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  disabled={busy}
                  type="submit" 
                  className="w-full bg-[#114b74] hover:bg-[#0f4063] text-white font-bold text-sm py-4 rounded-xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 uppercase shadow-lg shadow-black/20"
                >
                  {busy ? 'PROCESSING...' : (tab === 'login' ? 'LOGIN' : 'SIGN UP')}
                </button>
              </div>

              {tab === 'login' && (
                <div className="flex justify-center pt-2">
                  <button type="button" onClick={() => setMode('otp')} className="text-[0.75rem] font-bold text-on-surface flex items-center gap-1 hover:text-primary transition-colors">
                    Login with OTP <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[0.65rem] font-bold tracking-[0.1em] text-outline-variant uppercase ml-1">Phone Number</label>
                <div className="relative flex items-center">
                   <input 
                     required
                     className="w-full bg-surface-container-lowest border border-transparent focus:border-primary/30 rounded-xl py-3.5 pl-4 pr-12 text-sm text-on-surface placeholder:text-outline-variant/50 font-medium outline-none transition-all" 
                     placeholder="+1 (555) 000-0000" 
                     type="tel"
                     value={identifier}
                     onChange={e => setIdentifier(e.target.value)}
                   />
                   <span className="material-symbols-outlined absolute right-4 text-outline-variant text-[1.1rem]">call</span>
                </div>
              </div>
              <div className="pt-2">
                <button 
                  disabled={busy}
                  type="submit" 
                  className="w-full bg-[#114b74] hover:bg-[#0f4063] text-white font-bold text-sm py-4 rounded-xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 uppercase shadow-lg shadow-black/20"
                >
                  {busy ? 'SENDING...' : 'SEND OTP'}
                </button>
              </div>
              <div className="flex justify-center pt-2">
                <button type="button" onClick={() => setMode('password')} className="text-[0.75rem] font-bold text-on-surface flex items-center gap-1 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[1rem]">arrow_back</span> Return to Password
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-container-highest/30 border border-white/[0.02]">
            <span className="material-symbols-outlined text-tertiary text-[1rem]" style={{ fontVariationSettings: "'FILL' 0" }}>shield_person</span>
            <span className="text-[0.6rem] font-bold text-outline-variant tracking-[0.1em] uppercase">Encrypted Terminal Connection Active</span>
          </div>
        </div>
      </main>

      <footer className="w-full flex flex-col md:flex-row justify-between items-center px-8 py-6 absolute bottom-0 z-50 gap-4">
        <div className="text-[0.6rem] font-bold tracking-[0.1em] text-outline-variant uppercase">
          © 2024 SENTINEL TRANSIT SYSTEMS. ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-6 text-[0.6rem] font-bold tracking-[0.1em] text-outline-variant uppercase">
          <button className="hover:text-on-surface transition-colors">Privacy Policy</button>
          <button className="hover:text-on-surface transition-colors">Terms of Service</button>
          <button className="hover:text-on-surface transition-colors">Security Architecture</button>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#101418] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
