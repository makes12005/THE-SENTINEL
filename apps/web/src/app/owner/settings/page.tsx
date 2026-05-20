'use client';
/**
 * Owner — Agency Settings
 * Owner profile, agency details, operator permissions, notification triggers, danger zone.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, post } from '@/lib/api';
import toast from 'react-hot-toast';

interface AgencyProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  legal_name?: string;
  primary_city?: string;
  region_code?: string;
  headquarters_address?: string;
}

export default function OwnerSettingsPage() {
  const qc = useQueryClient();

  const { data: agency, isLoading } = useQuery<AgencyProfile>({
    queryKey: ['agency-profile'],
    queryFn: () => get<AgencyProfile>('/api/agency/profile'),
  });

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    legal_name: '',
    primary_city: '',
    region_code: '',
    headquarters_address: '',
  });

  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (agency) {
      setProfile((f) => ({
        ...f,
        name: agency.name,
        phone: agency.phone,
        email: agency.email,
        legal_name: agency.legal_name ?? f.legal_name,
        primary_city: agency.primary_city ?? f.primary_city,
        region_code: agency.region_code ?? f.region_code,
        headquarters_address: agency.headquarters_address ?? f.headquarters_address,
      }));
    }
  }, [agency]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof profile>) => put('/api/agency/profile', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agency-profile'] }); toast.success('Settings saved'); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to update'),
    onSettled: () => setSaving(false),
  });

  const passwordMutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) => post('/api/auth/change-password', body),
    onSuccess: () => {
      setPasswordForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to change password'),
  });

  const fieldClass = 'w-full rounded-xl border border-[#1e293b] bg-[#1e293b]/60 px-4 py-3 text-sm text-[#F1F5F9] placeholder-[#334155] outline-none focus:border-[#6C63FF]/60 transition-colors';
  const labelClass = 'text-[0.5625rem] font-bold uppercase tracking-widest text-[#475569] mb-1.5 block';

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0F172A]/95 backdrop-blur-md px-6">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-[#475569]">Velox Fleet Noir</p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="/owner/logs" 
            className="h-8 w-8 rounded-xl bg-[#1e293b] flex items-center justify-center text-[#475569] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
            title="View Alert Logs"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </a>
          <a 
            href="/owner/dashboard" 
            className="h-8 w-8 rounded-full bg-[#6C63FF]/30 flex items-center justify-center hover:bg-[#6C63FF]/50 transition-colors"
            title="Dashboard"
          >
            <span className="material-symbols-outlined text-[14px] text-[#6C63FF]">person</span>
          </a>
        </div>
      </header>

      <div className="p-6">
        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 border-l-4 border-[#FF7A00] pl-4">
            <div>
              <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Agency Settings</p>
              <h1 className="text-sm font-bold uppercase tracking-wide text-[#F1F5F9]">Operational Configuration Portal</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* LEFT: Owner Profile + Agency Details */}
          <div className="space-y-5">
            {/* Owner Profile */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Owner Profile</p>
                <span className="material-symbols-outlined text-[18px] text-[#334155]">person</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Owner Name</label>
                  <div className="flex gap-2">
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))}
                      className={`${fieldClass} flex-1`}
                    />
                    <button className="rounded-xl border border-[#1e293b] bg-[#1e293b] px-4 text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#F1F5F9] transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Contact Phone</label>
                  <div className="flex gap-2">
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))}
                      className={`${fieldClass} flex-1`}
                    />
                    <button className="rounded-xl border border-[#1e293b] bg-[#1e293b] px-4 text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#F1F5F9] transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className="flex gap-2">
                    <input
                      value={profile.email}
                      onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))}
                      className={`${fieldClass} flex-1`}
                    />
                    <button className="rounded-xl border border-[#1e293b] bg-[#1e293b] px-4 text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#F1F5F9] transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setSaving(true); updateMutation.mutate(profile); }}
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0B3C5D] to-[#6C63FF] py-3 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Agency Details */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Agency Details</p>
                <span className="material-symbols-outlined text-[18px] text-[#334155]">grid_view</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Agency Name</label>
                  <input value={profile.name} onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Agency Phone</label>
                  <input value={profile.phone} onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Agency Email</label>
                  <input value={profile.email} onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))} className={fieldClass} />
                </div>
                <button
                  onClick={() => {
                    setSaving(true);
                    updateMutation.mutate({ name: profile.name, phone: profile.phone, email: profile.email });
                  }}
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0B3C5D] to-[#6C63FF] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Agency Profile'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Operator Permissions + Notifications + Danger Zone */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#475569]">Change Password</p>
                <span className="material-symbols-outlined text-[18px] text-[#334155]">lock</span>
              </div>
              <div className="space-y-3">
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                  placeholder="Current password"
                  className={fieldClass}
                />
                <input
                  type="password"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                  placeholder="New password (min 8 chars)"
                  className={fieldClass}
                />
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                  className={fieldClass}
                />
                <button
                  onClick={() => {
                    if (!passwordForm.current || !passwordForm.next) {
                      toast.error('Current and new password are required');
                      return;
                    }
                    if (passwordForm.next.length < 8) {
                      toast.error('New password must be at least 8 characters');
                      return;
                    }
                    if (passwordForm.next !== passwordForm.confirm) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    passwordMutation.mutate({
                      current_password: passwordForm.current,
                      new_password: passwordForm.next,
                    });
                  }}
                  disabled={passwordMutation.isPending}
                  className="w-full rounded-xl border border-[#6C63FF]/40 bg-[#6C63FF]/10 py-3 text-xs font-black uppercase tracking-widest text-[#F1F5F9] disabled:opacity-50"
                >
                  {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-[#FF0000]/30 bg-[#FF0000]/5 p-6">
              <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#FF7A00] mb-2">Danger Zone</p>
              <p className="text-[0.625rem] text-[#475569] uppercase tracking-wide leading-relaxed mb-4">
                Closing this session will invalidate all active authorization tokens on this device immediately. Re-authentication will be required for further fleet management.
              </p>
              <button
                onClick={() => {
                  if (confirm('Terminate session? You will be logged out immediately.')) {
                    window.location.href = '/login';
                  }
                }}
                className="w-full rounded-xl border border-[#FF0000]/40 bg-transparent py-3 text-xs font-black uppercase tracking-widest text-[#FF7A00] hover:bg-[#FF0000]/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-[#1e293b] px-6 py-3 mt-8">
        <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155]">Build 09.22.Noir</span>
        <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#334155]">Transit Onyx Global Core</span>
      </footer>
    </div>
  );
}
