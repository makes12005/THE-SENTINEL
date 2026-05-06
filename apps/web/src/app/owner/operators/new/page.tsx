'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CreateOperatorPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '+91', email: '', notes: '', password: '' });
  const [saving, setSaving] = useState(false);

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => post('/api/owner/operators', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-operators'] });
      toast.success('Operator Registry Updated');
      router.push('/owner/operators');
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Registry access denied'),
    onSettled: () => setSaving(false),
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      toast.error('All mission-critical fields are required');
      return;
    }
    if (!/^\+91\d{10}$/.test(form.phone.trim())) {
      toast.error('Identity phone must be E.164 format (+91XXXXXXXXXX)');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Security key must be at least 8 characters');
      return;
    }
    setSaving(true);
    addMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] flex flex-col relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-[#6C63FF]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#0B3C5D]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#6C63FF]/2 rounded-full blur-[200px] pointer-events-none" />

      <div className="flex-grow max-w-3xl mx-auto w-full px-10 py-16 relative z-10">
        {/* Header Section */}
        <div className="mb-12">
          <Link href="/owner/operators" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#6C63FF] hover:text-[#F1F5F9] transition-all mb-6 group">
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            RETURN TO REGISTRY
          </Link>
          <h1 className="text-4xl font-black text-[#F1F5F9] mb-2 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            INITIALIZE OPERATOR
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#475569]">
            DEPLOYING NEW ASSET TO TRANSIT UNIT 04 COMMAND STACK
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleAdd} className="space-y-8">
          {/* Operator Identity */}
          <section className="bg-[#1e293b]/20 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C63FF]/5 blur-3xl rounded-full group-hover:bg-[#6C63FF]/10 transition-all duration-700" />
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-8 bg-[#6C63FF] rounded-full shadow-[0_0_15px_rgba(108,99,255,0.5)]"></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#cee5ff]">OPERATOR IDENTITY</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block px-2">
                  FULL OPERATIONAL NAME <span className="text-[#FF7A00]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#475569] text-[20px]">person</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Marcus Thorne"
                    className="w-full h-14 bg-[#0b0f12] border border-[#1e293b] rounded-full focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] text-[#F1F5F9] text-sm pl-14 pr-8 placeholder:text-[#334155] transition-all outline-none font-bold"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block px-2">
                    COMMS CHANNEL (PHONE) <span className="text-[#FF7A00]">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#475569] text-[20px]">call</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 00000-00000"
                      className="w-full h-14 bg-[#0b0f12] border border-[#1e293b] rounded-full focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] text-[#F1F5F9] text-sm pl-14 pr-8 placeholder:text-[#334155] transition-all outline-none font-bold font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block px-2">
                    DIGITAL ENDPOINT (EMAIL)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#475569] text-[20px]">alternate_email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="m.thorne@sentinel.com"
                      className="w-full h-14 bg-[#0b0f12] border border-[#1e293b] rounded-full focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] text-[#F1F5F9] text-sm pl-14 pr-8 placeholder:text-[#334155] transition-all outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block px-2">
                  SECURITY ENCRYPTION KEY <span className="text-[#FF7A00]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#475569] text-[20px]">lock</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="MINIMUM 8 CHARACTERS"
                    className="w-full h-14 bg-[#0b0f12] border border-[#1e293b] rounded-full focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] text-[#F1F5F9] text-sm pl-14 pr-8 placeholder:text-[#334155] transition-all outline-none font-bold tracking-[0.5em]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Operational Notes */}
          <section className="bg-[#1e293b]/20 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/5 blur-3xl rounded-full group-hover:bg-[#FF7A00]/10 transition-all duration-700" />
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-8 bg-[#FF7A00] rounded-full shadow-[0_0_15px_rgba(255,122,0,0.5)]"></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#cee5ff]">OPERATIONAL NOTES</h2>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569] block px-2">
                CERTIFICATIONS & PROTOCOLS
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="MENTION HEAVY-DUTY VEHICLE CERTIFICATIONS OR ROUTE-SPECIFIC CLEARANCES..."
                rows={4}
                className="w-full bg-[#0b0f12] border border-[#1e293b] rounded-[1.5rem] focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] text-[#F1F5F9] text-sm p-8 placeholder:text-[#334155] transition-all resize-none outline-none font-bold uppercase tracking-wide leading-relaxed"
              />
            </div>
          </section>

          {/* Login Access Protocol */}
          <section className="bg-[#1e293b]/20 backdrop-blur-xl border border-[#1e293b] p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C63FF]/5 blur-3xl rounded-full group-hover:bg-[#6C63FF]/10 transition-all duration-700" />
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-8 bg-[#6C63FF] rounded-full"></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#cee5ff]">ACCESS PROTOCOL</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="relative flex items-start p-6 cursor-pointer bg-[#0b0f12] border border-[#6C63FF]/40 rounded-2xl hover:border-[#6C63FF] transition-all group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6C63FF]/5 to-transparent pointer-events-none"></div>
                <input type="radio" name="access_method" defaultChecked className="mt-1 h-5 w-5 text-[#6C63FF] bg-[#0b0f12] border-[#1e293b] focus:ring-[#6C63FF] relative z-10" />
                <div className="ml-5 relative z-10">
                  <span className="block text-[11px] font-black uppercase tracking-widest text-[#F1F5F9]">GENERATE INVITE</span>
                  <span className="block text-[9px] text-[#475569] mt-1.5 uppercase font-bold tracking-tight">MANUAL BYPASS KEY GENERATION</span>
                </div>
              </label>
              <label className="relative flex items-start p-6 cursor-pointer bg-[#0b0f12] border border-[#1e293b] rounded-2xl hover:border-[#6C63FF] transition-all group opacity-50 hover:opacity-100">
                <input type="radio" name="access_method" className="mt-1 h-5 w-5 text-[#6C63FF] bg-[#0b0f12] border-[#1e293b] focus:ring-[#6C63FF]" />
                <div className="ml-5">
                  <span className="block text-[11px] font-black uppercase tracking-widest text-[#F1F5F9]">SMS DISPATCH</span>
                  <span className="block text-[9px] text-[#475569] mt-1.5 uppercase font-bold tracking-tight">AUTOMATED CREDENTIAL SYNC</span>
                </div>
              </label>
            </div>
          </section>

          {/* Bottom Actions */}
          <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6 pt-10 border-t border-[#1e293b]">
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto h-16 px-14 bg-gradient-to-r from-[#6C63FF] to-[#0B3C5D] text-[#F1F5F9] text-[11px] font-black uppercase tracking-[0.3em] rounded-full hover:brightness-125 active:scale-95 transition-all disabled:opacity-50 shadow-[0_10px_40px_rgba(108,99,255,0.25)] hover:shadow-[0_15px_50px_rgba(108,99,255,0.4)]"
            >
              {saving ? 'UPDATING REGISTRY...' : 'AUTHORIZE OPERATOR'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/owner/operators')}
              className="w-full md:w-auto px-10 py-4 text-[#475569] hover:text-[#F1F5F9] text-[11px] font-black uppercase tracking-[0.25em] transition-all text-center group flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-500">close</span>
              ABORT MISSION
            </button>
          </div>
        </form>

        {/* Security Clearance Footer */}
        <div className="mt-20 bg-[#0b0f12] border border-[#1e293b] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row items-stretch shadow-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#6C63FF]/5 to-transparent pointer-events-none"></div>
          <div className="w-full md:w-56 h-40 md:h-auto bg-[#0b0f12] flex-shrink-0 relative overflow-hidden flex items-center justify-center border-r border-[#1e293b]">
            <div className="absolute inset-0 bg-black/40 z-10" />
            <img 
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" 
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 contrast-150 group-hover:scale-110 transition-transform duration-1000"
              alt="Cybersecurity grid"
            />
            <span className="material-symbols-outlined text-[48px] text-[#6C63FF] relative z-20 animate-pulse">terminal</span>
          </div>
          <div className="p-8 md:p-12 flex flex-col justify-center relative z-10">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6C63FF] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6C63FF]"></span>
              SECURITY PROTOCOL A-14
            </h3>
            <p className="text-[10px] leading-relaxed text-[#475569] uppercase font-bold tracking-wide">
              ALL NEW OPERATORS ARE SUBJECT TO THE <span className="text-[#cee5ff]">SENTINEL BACKGROUND CHECK PROTOCOL</span>. CREDENTIALS WILL BE VALID FOR 24 HOURS UNTIL FIRST MISSION LOGIN. ENSURE ALL IDENTITY DATA MATCHES CERTIFIED GOVERNMENT ID FOR AUDIT COMPLIANCE.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full py-8 mt-auto border-t border-[#1e293b] flex justify-between items-center px-12 opacity-30">
        <div className="font-manrope text-[9px] font-black uppercase tracking-[0.3em] text-[#475569]">
          © 2026 THE SENTINEL · MISSION CRITICAL INFRASTRUCTURE
        </div>
        <div className="flex gap-8">
          <span className="font-manrope text-[9px] font-black uppercase tracking-[0.3em] text-[#475569]">NODE: GUJARAT_WEST_1</span>
          <span className="font-manrope text-[9px] font-black uppercase tracking-[0.3em] text-[#475569]">V4.8.2-OMEGA</span>
        </div>
      </footer>
    </div>
  );
}
