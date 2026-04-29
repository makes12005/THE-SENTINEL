'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { redirectPathForRole, redirectPathForUser } from '@/lib/auth-redirect';

function OtpInput({ value, onChange, disabled }: { value: string; onChange(v: string): void; disabled?: boolean }) {
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
          disabled={disabled}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          autoComplete="one-time-code"
          className="w-full aspect-square text-center text-xl font-black rounded-2xl bg-surface-container-high border-2 border-transparent focus:border-primary focus:bg-surface-container-highest text-on-surface outline-none transition-all shadow-inner disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function TopAppBar() {
  const router = useRouter();
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-outline-variant/10 relative z-20 bg-background/50 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="mr-2 p-2 rounded-xl hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
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

function VerifyOtpPageInner() {
  const router       = useRouter();
  const params       = useSearchParams();
  const setSession   = useAuthStore((s) => s.setSession);

  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp]               = useState('');
  const [busy, setBusy]             = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('auth_identifier')
                 || sessionStorage.getItem('signup_phone')
                 || sessionStorage.getItem('otp_phone');
    if (!stored) {
      router.replace('/login');
      return;
    }
    setIdentifier(stored);
    startCountdown();
  }, [router]);

  function startCountdown() {
    setResendSeconds(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => { 
        if (s <= 1) { 
          if (timerRef.current) clearInterval(timerRef.current); 
          return 0; 
        } 
        return s - 1; 
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendSeconds > 0 || !identifier) return;
    setBusy(true);
    try {
      const res = await api.post<{ success: boolean; data: { otp?: string } }>(
        '/api/auth/send-otp', { identifier }
      );
      const devOtp = res.data?.data?.otp;
      if (devOtp) toast(`New OTP (dev): ${devOtp}`, { icon: '🔑' });
      else toast.success('New OTP sent!');
      startCountdown();
    } catch {
      toast.error('Could not send OTP. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter all 6 digits.'); return; }
    setBusy(true);
    try {
      const flow = params.get('flow') ?? 'login';

      if (flow === 'signup') {
        const res = await api.post<{
          success: boolean;
          data: { is_new_user: boolean; temp_token?: string; accessToken?: string; refreshToken?: string; user?: any };
        }>('/api/auth/verify-otp', { contact: identifier, otp });

        if (res.data?.data?.is_new_user) {
          const tempToken = res.data?.data?.temp_token;
          if (!tempToken) throw new Error('Signup token missing');
          sessionStorage.setItem('signup_temp_token', tempToken);
          const nextParam = params.get('next') ?? '/signup/promo';
          const destination = `/${nextParam.replace(/^\//, '')}`;
          router.replace(destination);
          return;
        }

        const existingUser = res.data?.data?.user;
        const accessToken = res.data?.data?.accessToken;
        const refreshToken = res.data?.data?.refreshToken;
        if (existingUser && accessToken && refreshToken) {
          setSession({ accessToken, refreshToken, user: existingUser });
          ['auth_identifier', 'auth_source', 'signup_phone', 'otp_phone'].forEach((k) => sessionStorage.removeItem(k));
          router.replace(redirectPathForUser(existingUser));
          return;
        }

        throw new Error('Unexpected signup verification response');
      }

      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: any };
      }>('/api/auth/login-otp', { contact: identifier, otp });

      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      ['auth_identifier', 'auth_source', 'signup_phone', 'otp_phone'].forEach((k) => sessionStorage.removeItem(k));
      const nextParam = params.get('next');
      const destination = nextParam ? `/${nextParam.replace(/^\//, '')}` : redirectPathForUser(user);
      toast.success(`Welcome, ${user?.name ?? 'User'}!`);
      setTimeout(() => router.push(destination), 600);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Incorrect OTP. Try again.';
      toast.error(msg);
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  const maskedIdentifier = identifier.includes('@')
    ? identifier.replace(/^(.{2}).*(@.*)$/, '$1***$2')
    : identifier.replace(/(\+?\d{2,3})\d+(\d{4})/, '$1*****$2');

  return (
    <div className="rugged-bg min-h-screen flex flex-col font-body text-on-surface overflow-x-hidden">
      <TopAppBar />

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-surface-container-high mb-8 shadow-2xl border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary text-5xl" style={{fontVariationSettings: "'FILL' 1"}}>
                shield_lock
              </span>
            </div>
            <h2 className="font-headline font-black text-4xl mb-3 tracking-tight">Access Verification</h2>
            <p className="text-on-surface-variant font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
              A temporary authentication code has been dispatched to your device.
            </p>
            <p className="mt-4 text-primary font-black tracking-widest text-xs uppercase">{maskedIdentifier || '...'}</p>
          </div>

          <form onSubmit={handleVerify} className="w-full">
            <OtpInput value={otp} onChange={setOtp} disabled={busy} />

            <div className="space-y-6 pt-4">
              <button 
                type="submit"
                disabled={busy || otp.length < 6}
                className="w-full h-18 bg-primary text-on-primary font-black text-sm tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group uppercase disabled:opacity-50"
              >
                {busy ? (
                  <div className="w-6 h-6 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <>
                    VALIDATE PROTOCOL
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">verified</span>
                  </>
                )}
              </button>

              <div className="flex flex-col items-center gap-4">
                {resendSeconds > 0 ? (
                  <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-container-high border border-outline-variant/10 shadow-lg">
                    <span className="material-symbols-outlined text-primary text-lg animate-pulse" style={{fontVariationSettings: "'FILL' 1"}}>timer</span>
                    <span className="font-label font-black text-on-surface text-[10px] tracking-[0.2em] uppercase">Reissue in 00:{String(resendSeconds).padStart(2, '0')}</span>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResend} 
                    disabled={busy} 
                    className="text-[10px] font-black text-on-surface-variant/40 hover:text-primary transition-colors uppercase tracking-[0.3em]"
                  >
                    Resend Auth Code →
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>

      <aside className="hidden lg:block fixed right-12 top-1/2 -translate-y-1/2 w-64 space-y-6">
        <div className="p-6 bg-surface-container-high/40 backdrop-blur-md rounded-3xl border border-outline-variant/10 relative overflow-hidden group">
          <h4 className="font-label text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60 mb-4">Security Protocol</h4>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-4">
            <div className="h-full w-4/5 bg-primary rounded-full shadow-[0_0_10px_rgba(163,203,242,0.5)]"></div>
          </div>
          <p className="font-medium text-[11px] text-on-surface-variant/80 leading-relaxed">Multi-factor authentication is active. Sentinel Shield is monitoring this session.</p>
          
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <span className="material-symbols-outlined text-[100px]">lock</span>
          </div>
        </div>
        
        <div className="p-6 bg-surface-container-high/40 backdrop-blur-md rounded-3xl border border-outline-variant/10">
          <h4 className="font-label text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60 mb-2">Login Origin</h4>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm">location_on</span>
            </div>
            <div>
              <p className="font-black text-xs text-on-surface uppercase tracking-tight">Secure Network</p>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Primary Access Node</p>
            </div>
          </div>
        </div>
      </aside>

      <footer className="p-8 text-center text-on-surface-variant/20 font-label text-[10px] tracking-[0.5em] uppercase">
        Sentinel Secure Node v4.2.0
      </footer>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpPageInner />
    </Suspense>
  );
}
