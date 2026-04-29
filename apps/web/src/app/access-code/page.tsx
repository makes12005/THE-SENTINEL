'use client';

import { useState, Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import { markAccessCodeCompleted, hasCompletedAccessCode } from '@/lib/auth-redirect';

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

function AccessCodePageInner() {
  const router = useRouter();
  const { user, setSession } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'passenger') return;
    if (hasCompletedAccessCode(user.id)) {
      router.replace('/operator/dashboard');
    }
  }, [router, user]);

  async function handleContinue() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return toast.error('Enter your agency invite code');
    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: {
          accessToken?: string;
          access_token?: string;
          refreshToken?: string;
          refresh_token?: string;
          user?: any;
        };
      }>('/api/auth/join-agency', { inviteCode: trimmed });

      const data = res.data?.data;
      const accessToken = data?.accessToken ?? data?.access_token;
      const refreshToken = data?.refreshToken ?? data?.refresh_token;
      const user = data?.user;
      if (accessToken && refreshToken && user) {
        setSession({ accessToken, refreshToken, user });
        markAccessCodeCompleted(user.id);
      }

      toast.success('Agency linked successfully!');
      router.push('/operator/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    markAccessCodeCompleted(user?.id);
    toast('Skipped — link agency later via profile.', { icon: 'ℹ️' });
    router.push('/operator/dashboard');
  }

  return (
    <div className="rugged-bg min-h-screen flex flex-col font-body text-on-surface overflow-x-hidden">
      <TopAppBar />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-surface-container-high border border-outline-variant/10 mb-8 shadow-2xl">
              <span className="material-symbols-outlined text-4xl text-primary font-bold">terminal</span>
            </div>
            <h2 className="text-4xl font-headline font-black tracking-tight mb-3">Sync Node</h2>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-[280px] mx-auto">
              Enter your unique agency access key to establish a secure data uplink.
            </p>
          </div>

          {/* Input Group */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] ml-4">
                Access Key
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SENTINEL-XXXX"
                  className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-5 px-6 text-on-surface placeholder:text-on-surface-variant/20 focus:border-primary focus:bg-surface-container-highest outline-none transition-all text-center text-xl font-black tracking-[0.2em] uppercase shadow-inner"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-4">
              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-primary text-on-primary font-black text-sm py-5 rounded-2xl tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl shadow-primary/30 uppercase disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <>
                    ESTABLISH UPLINK
                    <span className="material-symbols-outlined text-[18px]">key_visualizer</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-4 text-[10px] font-black text-on-surface-variant/40 hover:text-on-surface-variant transition-colors uppercase tracking-[0.3em]"
              >
                Skip Protocol Integration →
              </button>
            </div>
          </div>

          {/* Meta Info */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 h-[1px] bg-outline-variant/10"></div>
              <span className="material-symbols-outlined text-on-surface-variant/20 text-sm">security</span>
              <div className="flex-1 h-[1px] bg-outline-variant/10"></div>
            </div>
            <footer className="text-center text-on-surface-variant/30 font-label text-[10px] tracking-[0.4em] uppercase">
              Sentinel Secure Node v4.2.0
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessCodePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <AccessCodePageInner />
    </Suspense>
  );
}
