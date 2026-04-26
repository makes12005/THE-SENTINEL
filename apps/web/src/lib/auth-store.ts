/**
 * Auth store — Zustand
 * Stores user info in localStorage and exposes login/logout.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { setAuthActions } from './api';
import axios from 'axios';

export interface AuthUser {
  id:       string;
  name:     string;
  phone:    string | null;   // null for email-only accounts
  email:    string | null;   // null for phone-only accounts
  role:     string;
  agencyId: string | null;
  redirect?: string;         // server-side redirect hint
}

interface AuthState {
  user:         AuthUser | null;
  token:        string | null;
  refreshToken: string | null;
  login:        (phone: string, password: string) => Promise<void>;
  /** Used by OAuth (Google) callback to inject tokens directly */
  setSession: (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  logout:       () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      token:        null,
      refreshToken: null,

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

        set({ user, token: access_token, refreshToken: null });
      },

      setSession: ({ accessToken, refreshToken, user }) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token: accessToken, refreshToken });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        set({ user: null, token: null, refreshToken: null });
        window.location.href = '/login';
      },
    }),
    {
      name: 'busalert-auth',
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }),
    }
  )
);

// Inject actions into API to handle 401s without circular dependency
setAuthActions(
  () => useAuthStore.getState().logout(),
  async (refreshToken) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/auth/refresh`, {
        refreshToken,
      });

      if (res.data.success) {
        const { access_token, refresh_token, user } = res.data.data;
        // Update store directly
        useAuthStore.setState({ 
          token: access_token, 
          refreshToken: refresh_token, 
          user 
        });
        // Sync with legacy localStorage keys
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { accessToken: access_token, refreshToken: refresh_token, user };
      }
      return null;
    } catch (err) {
      return null;
    }
  }
);
