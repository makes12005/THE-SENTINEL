'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_REDIRECTS: Record<string, string> = {
  admin:     '/admin/dashboard',
  owner:     '/owner/dashboard',
  operator:  '/operator/dashboard',
  driver:    '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

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

function ProfileSetupInner() {
  const router = useRouter();
  const { user, setSession } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Full name is required');
    
    setBusy(true);
    try {
      const res = await api.patch('/api/users/profile', { name: name.trim(), phone });
      if (res.data.success) {
        const updatedUser = { ...user!, name: name.trim(), phone };
        // Update user in store - ideally setSession should be able to update partially
        // For now, we assume the backend update is reflected in the store if we were to refetch,
        // but we'll manually update for immediate feedback.
        
        toast.success('Profile finalized.');
        
        const destination = ROLE_REDIRECTS[updatedUser.role] ?? '/access-code';
        router.push(destination);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rugged-bg min-h-screen flex flex-col font-body text-on-surface overflow-x-hidden">
      <TopAppBar />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[480px]">
          {/* Progress */}
          <div className="mb-12 flex items-center justify-between gap-3">
            <div className="h-1.5 flex-1 bg-primary rounded-full shadow-[0_0_10px_rgba(163,203,242,0.3)]"></div>
            <div className="h-1.5 flex-1 bg-primary rounded-full shadow-[0_0_10px_rgba(163,203,242,0.3)]"></div>
            <div className="h-1.5 flex-1 bg-surface-container-high rounded-full"></div>
          </div>

          {/* Header */}
          <section className="mb-12 text-center">
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 rounded-[2.5rem] bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-dashed border-outline-variant/30 group hover:border-primary/50 transition-colors shadow-2xl">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 group-hover:text-primary/50 transition-colors">add_a_photo</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-xl border-4 border-[#0d0f14] active:scale-90 transition-transform cursor-pointer">
                <span className="material-symbols-outlined text-xl font-bold">edit</span>
              </div>
            </div>
            <h2 className="text-4xl font-headline font-black tracking-tight mb-3">Finalize Identity</h2>
            <p className="text-sm text-on-surface-variant font-medium">Verify your operational parameters before uplink.</p>
          </section>

          {/* Form */}
          <form onSubmit={handleComplete} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] ml-4">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors">person</span>
                <input 
                  className="w-full bg-surface-container-high border-2 border-transparent rounded-2xl py-5 pl-14 pr-6 text-on-surface font-bold focus:border-primary focus:bg-surface-container-highest outline-none transition-all shadow-inner" 
                  placeholder="Enter full name" 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] ml-4">Phone Number</label>
              <div className="flex gap-3">
                <div className="bg-surface-container-high rounded-2xl px-6 py-5 flex items-center gap-2 text-on-surface font-black shadow-inner">
                  <span className="text-[10px] opacity-40">IN</span>
                  <span className="text-sm">+91</span>
                </div>
                <div className="relative flex-1 group">
                  <input 
                    readOnly
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl py-5 px-6 text-on-surface-variant/60 font-bold outline-none cursor-not-allowed" 
                    type="tel" 
                    value={phone?.replace('+91', '') || ''} 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary">
                    <span className="material-symbols-outlined font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] ml-4">Assigned Role</label>
              <div className="relative bg-surface-container-high/40 rounded-3xl p-6 border border-outline-variant/10 flex items-center justify-between overflow-hidden group">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined text-2xl font-bold">
                      {user?.role === 'passenger' ? 'person' : 'directions_bus'}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-lg text-on-surface uppercase tracking-tight">{user?.role || 'User'}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">Verified Protocol</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/20" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                
                {/* Decorative */}
                <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <span className="material-symbols-outlined text-[120px]">shield</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-5 mt-4 border border-primary/10 flex gap-4">
              <span className="material-symbols-outlined text-primary text-xl">info</span>
              <p className="text-[11px] text-on-surface-variant/80 font-medium leading-relaxed">
                By completing the setup, you agree to the <span className="text-primary font-bold">Transit Terms</span> and operational guidelines of The Sentinel Network.
              </p>
            </div>

            <div className="pt-6">
              <button 
                disabled={busy}
                type="submit"
                className="w-full h-18 bg-primary text-on-primary font-black text-sm tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group uppercase"
              >
                {busy ? (
                  <div className="w-6 h-6 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <>
                    COMPLETE ACTIVATION
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">arrow_forward</span>
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-[10px] font-black text-on-surface-variant/20 uppercase tracking-[0.5em]">Sentinel Network v4.2.0</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <ProfileSetupInner />
    </Suspense>
  );
}

