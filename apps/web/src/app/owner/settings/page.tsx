'use client';
/**
 * Owner — Screen 5: Agency Settings
 * Edit agency name, phone, email, state.
 * Also allows changing own password.
 * Data: GET/PUT /api/agency/profile
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, post } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import toast from 'react-hot-toast';

interface AgencyProfile {
  id:    string;
  name:  string;
  phone: string;
  email: string;
  state: string;
}

export default function OwnerSettingsPage() {
  const qc = useQueryClient();

  const { data: agency, isLoading } = useQuery<AgencyProfile>({
    queryKey: ['agency-profile'],
    queryFn:  () => get<AgencyProfile>('/api/agency/profile'),
  });

  const [profile, setProfile] = useState({ name: '', phone: '', email: '', state: '' });
  const [pwForm,  setPwForm]  = useState({ current: '', newPw: '', confirm: '' });
  const [saving,  setSaving]  = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Sync form when agency data loads
  useEffect(() => {
    if (agency) {
      setProfile({ name: agency.name, phone: agency.phone, email: agency.email, state: agency.state });
    }
  }, [agency]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof profile) => put('/api/agency/profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-profile'] });
      toast.success('Agency profile updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to update'),
    onSettled: () => setSaving(false),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    updateMutation.mutate(profile);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await post('/api/auth/change-password', {
        current_password: pwForm.current,
        new_password:     pwForm.newPw,
      });
      setPwForm({ current: '', newPw: '', confirm: '' });
      toast.success('Password changed successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const fieldClass = 'w-full bg-[#101418] border border-[#42474e]/40 rounded-xl px-4 py-3 text-sm text-[#e0e2e8] placeholder-[#8c9198] outline-none focus:border-[#c4c0ff] transition-colors';
  const labelClass = 'text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-2 block';

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Agency Settings" subtitle="Profile & configuration" />
      </header>

      <div className="p-8 max-w-2xl space-y-8">
        {/* Agency Profile */}
        <div className="bg-[#181c20] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-[#3826cd]/20 flex items-center justify-center text-[#c4c0ff]">
              <span className="material-symbols-outlined">business</span>
            </div>
            <h2 className="text-lg font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Agency Profile
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-12 bg-[#262a2f] rounded-xl" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className={labelClass}>Agency Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))}
                  className={fieldClass}
                  placeholder="Gujarat Travel Agency"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))}
                    className={fieldClass}
                    placeholder="+919876543210"
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile((f) => ({ ...f, state: e.target.value }))}
                    className={fieldClass}
                    placeholder="Gujarat"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))}
                  className={fieldClass}
                  placeholder="agency@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-[#c4c0ff] text-[#2000a4] font-bold text-sm uppercase tracking-widest px-6 py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-[#181c20] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-[#602a00]/30 flex items-center justify-center text-[#ffb68b]">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <h2 className="text-lg font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'Current Password', key: 'current', placeholder: '••••••••' },
              { label: 'New Password',     key: 'newPw',   placeholder: '••••••••' },
              { label: 'Confirm New',      key: 'confirm', placeholder: '••••••••' },
            ].map((field) => (
              <div key={field.key}>
                <label className={labelClass}>{field.label}</label>
                <input
                  type="password"
                  value={(pwForm as any)[field.key]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className={fieldClass}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={savingPw}
              className="bg-[#ffb68b] text-[#522300] font-bold text-sm uppercase tracking-widest px-6 py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {savingPw ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Notification Preferences (UI only) */}
        <div className="bg-[#181c20] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-[#0b3c5d]/40 flex items-center justify-center text-[#a3cbf2]">
              <span className="material-symbols-outlined">notifications</span>
            </div>
            <h2 className="text-lg font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3 opacity-60 select-none">
            {[
              'Email digest on trip completion',
              'SMS alert on conductor offline',
              'Daily summary report',
            ].map((pref) => (
              <div key={pref} className="flex items-center justify-between bg-[#1c2024] p-4 rounded-xl">
                <span className="text-sm text-[#c2c7ce]">{pref}</span>
                <div className="h-6 w-11 rounded-full bg-[#42474e] relative">
                  <div className="absolute h-4 w-4 rounded-full bg-white top-1 left-1" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8c9198] mt-3">Notification settings coming in Sprint 9.</p>
        </div>
      </div>
    </div>
  );
}
