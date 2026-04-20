/**
 * Auth store — Zustand
 * Stores user info in localStorage and exposes login/logout.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

export interface AuthUser {
  id:       string;
  name:     string;
  phone:    string;
  role:     string;
  agencyId: string;
}

interface AuthState {
  user:  AuthUser | null;
  token: string | null;
  login:  (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:  null,
      token: null,

      login: async (phone, password) => {
        const res = await api.post<{ success: boolean; data: { access_token: string; user: AuthUser } }>(
          '/api/auth/login',
          { phone, password }
        );
        if (!res.data.success) throw new Error('Login failed');

        const { access_token, user } = res.data.data;

        // Also store in localStorage for Axios interceptor
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        set({ user, token: access_token });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
        window.location.href = '/login';
      },
    }),
    {
      name: 'busalert-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);
