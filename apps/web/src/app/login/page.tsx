'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

const ROLE_REDIRECTS: Record<string, string> = {
  operator: '/operator/dashboard',
  owner:    '/owner/dashboard',
  admin:    '/admin/dashboard',
  conductor: '/operator/dashboard', // fallback
  driver:    '/operator/dashboard',
};

export default function LoginPage() {
  const router  = useRouter();
  const login   = useAuthStore((s) => s.login);
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

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

  return (
    <div className="min-h-screen bg-[#101418] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0b3c5d]/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0b3c5d] mb-4">
            <span className="material-symbols-outlined text-4xl text-[#a3cbf2]">directions_bus</span>
          </div>
          <h1 className="text-3xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            BusOps Control
          </h1>
          <p className="text-xs text-[#c2c7ce] uppercase tracking-[0.2em] mt-1 opacity-70">
            Sentinel System
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#181c20] rounded-2xl p-8 border border-[#42474e]/30 shadow-2xl">
          <h2 className="text-lg font-bold text-[#e0e2e8] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Sign In
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2">
                Phone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-[#8c9198]">
                  <span className="material-symbols-outlined text-[18px]">phone</span>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-[#1c2024] border border-[#42474e] rounded-xl pl-11 pr-4 py-3.5 text-[#e0e2e8] placeholder-[#8c9198] focus:outline-none focus:ring-2 focus:ring-[#a3cbf2]/50 focus:border-[#a3cbf2] transition-all"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a3cbf2] text-[#003353] font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-[#003353]/30 border-t-[#003353] rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8c9198] mt-6">
          Bus Alert System · Secure Operations Portal
        </p>
      </div>
    </div>
  );
}
