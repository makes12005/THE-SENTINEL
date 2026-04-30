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
    <div className="grid grid-cols-6 gap-3 mb-12 w-full" onPaste={handlePaste}>
      {[0,1,2,3,4,5].map((i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          placeholder="•"
          disabled={disabled}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          autoComplete="one-time-code"
          className="w-full aspect-square text-center font-headline font-bold text-2xl bg-surface-container-high border-none rounded-xl text-primary focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all outline-none shadow-sm disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function TopAppBar() {
  const router = useRouter();
  return (
    <header className="flex items-center w-full px-6 py-4 h-16 bg-[#181c20] sticky top-0 z-50">
      <div className="flex items-center gap-4 w-full">
        <button onClick={() => router.back()} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-[#262a2f] transition-colors duration-200 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[#a3cbf2]">arrow_back</span>
        </button>
        <h1 className="font-headline font-bold text-lg tracking-tight text-[#a3cbf2]">Verify OTP</h1>
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
    <div className="bg-background text-on-background font-body antialiased min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decorative Blur mapped to rugged-surface */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at top left, rgba(163, 203, 242, 0.05), transparent)'
      }}></div>
      
      <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none mix-blend-overlay" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
      }}></div>

      <TopAppBar />

      <main className="flex-grow flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-surface-container-high mb-8">
            <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_lock
            </span>
          </div>
          <h2 className="font-headline font-extrabold text-3xl mb-3 tracking-tight text-on-surface">Enter Code</h2>
          <p className="font-body text-on-surface-variant text-base leading-relaxed">
            Enter the 6-digit code sent to <span className="font-bold text-on-surface">{maskedIdentifier || 'your phone'}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="w-full">
          <OtpInput value={otp} onChange={setOtp} disabled={busy} />

          <div className="w-full space-y-8">
            <button 
              type="submit"
              disabled={busy || otp.length < 6}
              className="w-full h-16 bg-on-tertiary-container text-on-tertiary font-headline font-extrabold text-lg rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-tertiary-container/20 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {busy ? (
                <div className="w-6 h-6 border-2 border-on-tertiary/30 border-t-on-tertiary rounded-full animate-spin" />
              ) : (
                <>
                  VERIFY
                  <span className="material-symbols-outlined">chevron_right</span>
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-4">
              {resendSeconds > 0 ? (
                <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-surface-container-low">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                  <span className="font-headline font-bold text-secondary tracking-wider">00:{String(resendSeconds).padStart(2, '0')}</span>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={busy} 
                  className="font-label font-bold text-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="absolute bottom-0 left-0 right-0 h-64 -z-10 opacity-20 pointer-events-none overflow-hidden blur-2xl">
          <div className="w-full h-full bg-gradient-to-t from-primary-container to-transparent"></div>
        </div>
      </main>

      <aside className="hidden lg:block fixed right-12 top-1/2 -translate-y-1/2 w-64 space-y-6 z-10">
        <div className="p-6 bg-surface-container-low rounded-xl border-l-4 border-primary shadow-lg">
          <h4 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">Security Level</h4>
          <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-primary rounded-full"></div>
          </div>
          <p className="font-body text-xs text-on-surface-variant mt-2">Enhanced encrypted verification protocol active.</p>
        </div>
        
        <div className="p-6 bg-surface-container-low rounded-xl border-l-4 border-tertiary shadow-lg">
          <h4 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">Login Attempt</h4>
          <div className="flex items-baseline gap-1">
            <span className="font-headline font-bold text-2xl text-on-surface">Protected</span>
          </div>
          <p className="font-body text-xs text-on-surface-variant mt-1">Verified Session Origin</p>
        </div>
      </aside>

      <footer className="p-8 text-center text-on-surface-variant/30 font-label text-[10px] tracking-[0.3em] uppercase z-10">
        Sentinel Secure Node v4.2.0
      </footer>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpPageInner />
    </Suspense>
  );
}
