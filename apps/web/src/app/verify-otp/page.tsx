'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';

const ROLE_REDIRECTS: Record<string, string> = {
  admin:     '/admin/dashboard',
  owner:     '/owner/dashboard',
  operator:  '/operator/dashboard',
  driver:    '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose(): void }) {
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10, maxWidth: 400,
      color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      background: type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#0284c7',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>âœ•</button>
    </div>
  );
}

function OtpInput({ value, onChange, disabled }: { value: string; onChange(v: string): void; disabled?: boolean }) {
  const digits = value.padEnd(6, '').split('');

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = value.slice(0, idx === 0 ? 0 : idx - 1) + value.slice(idx + 1);
      onChange(next.slice(0, 6));
      if (idx > 0) (document.getElementById(`ov-${idx - 1}`) as HTMLInputElement)?.focus();
    }
  }

  function handleChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.slice(-1);
    if (!/\d/.test(char)) return;
    const arr = value.padEnd(6, '').split('');
    arr[idx] = char;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (idx < 5) (document.getElementById(`ov-${idx + 1}`) as HTMLInputElement)?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length) { onChange(pasted); e.preventDefault(); }
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`ov-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d === ' ' ? '' : d}
          onChange={(ev) => handleChange(i, ev)}
          onKeyDown={(ev) => handleKey(i, ev)}
          style={{
            width: 52, height: 60, textAlign: 'center', fontSize: 24, fontWeight: 700,
            borderRadius: 12, border: '2px solid',
            borderColor: d !== ' ' && d ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            outline: 'none', caretColor: 'transparent',
            transition: 'border-color 0.2s',
          }}
        />
      ))}
    </div>
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((m: string, t: 'success' | 'error' | 'info') => setToast({ message: m, type: t }), []);

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
  }, []);

  function startCountdown() {
    setResendSeconds(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => { if (s <= 1) { clearInterval(timerRef.current!); return 0; } return s - 1; });
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
      if (devOtp) showToast(`New OTP (dev): ${devOtp}`, 'info');
      else showToast('New OTP sent!', 'success');
      startCountdown();
    } catch {
      showToast('Could not send OTP. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { showToast('Enter all 6 digits.', 'error'); return; }
    setBusy(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: any };
      }>('/api/auth/verify-otp', { identifier, otp });

      const { accessToken, refreshToken, user } = res.data.data;
      setSession({ accessToken, refreshToken, user });
      ['auth_identifier', 'auth_source', 'signup_phone', 'otp_phone'].forEach((k) => sessionStorage.removeItem(k));

      const nextParam = params.get('next');
      const roleRedirect = ROLE_REDIRECTS[user?.role] ?? '/access-code';
      const destination  = nextParam ? `/${nextParam.replace(/^\//, '')}` : roleRedirect;

      showToast(`Welcome, ${user?.name ?? 'User'}! ðŸŽ‰`, 'success');
      setTimeout(() => router.push(destination), 600);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Incorrect OTP. Try again.';
      showToast(msg, 'error');
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  const maskedIdentifier = identifier.includes('@')
    ? identifier.replace(/^(.{2}).*(@.*)$/, '$1***$2')
    : identifier.replace(/(\+?\d{2,3})\d+(\d{4})/, '$1*****$2');

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif}`}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '40px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 8px 24px rgba(99,102,241,0.45)' }}>ðŸ“±</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Enter OTP</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: '#a5b4fc' }}>{maskedIdentifier || 'â€¦'}</strong>
          </p>
          <form onSubmit={handleVerify}>
            <OtpInput value={otp} onChange={setOtp} disabled={busy} />
            <button id="verify-otp-submit" type="submit" disabled={busy || otp.length < 6} style={{ width: '100%', marginTop: 28, padding: '14px', borderRadius: 10, border: 'none', background: otp.length === 6 && !busy ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: otp.length === 6 ? 'pointer' : 'not-allowed', boxShadow: otp.length === 6 ? '0 4px 20px rgba(99,102,241,0.45)' : 'none', transition: 'all 0.3s' }}>
              {busy ? 'Verifyingâ€¦' : 'Verify & Continue â†’'}
            </button>
          </form>
          <div style={{ marginTop: 20 }}>
            {resendSeconds > 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Resend OTP in <strong style={{ color: '#a5b4fc' }}>{resendSeconds}s</strong>
              </p>
            ) : (
              <button id="resend-otp" onClick={handleResend} disabled={busy} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                Resend OTP
              </button>
            )}
          </div>
          <button onClick={() => router.push('/login')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12 }}>
            â† Back to login
          </button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '9999px', border: '4px solid rgba(255,255,255,0.15)', borderTopColor: '#818cf8', animation: 'spin 1s linear infinite' }} />
          <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
        </div>
      }
    >
      <VerifyOtpPageInner />
    </Suspense>
  );
}
