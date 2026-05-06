/**
 * Axios API client — Sprint 7
 * Base URL: NEXT_PUBLIC_API_URL env variable
 * Attaches JWT from localStorage on every request.
 * Handles token refresh via injected actions to avoid circular dependencies.
 */
import http from './http';

// Auth actions to be injected by auth-store to avoid circular dependencies
let logoutAction: (() => void) | null = null;
let refreshAction: ((token: string) => Promise<{ accessToken: string; refreshToken: string; user: any } | null>) | null = null;

export const setAuthActions = (
  logout: () => void, 
  refresh: (token: string) => Promise<{ accessToken: string; refreshToken: string; user: any } | null>
) => {
  logoutAction = logout;
  refreshAction = refresh;
};

// Request interceptor — attach token
http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('access_token');
    if (!token) {
      const authData = localStorage.getItem('busalert-auth');
      if (authData) {
        try {
          token = JSON.parse(authData).state?.token ?? null;
        } catch {
          token = null;
        }
      }
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent multiple refresh calls — reset on every module load (handles HMR)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Response interceptor — handle 401 and refresh
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Ignore 401s from auth endpoints so the frontend can display the actual error (e.g. wrong password)
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
      return Promise.reject(err);
    }

    // If the refresh endpoint itself returns a 4xx or 5xx, clear auth and go to login
    if (originalRequest.url?.includes('/auth/refresh')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('busalert-auth');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to get refresh token from localStorage (managed by Zustand persist)
      const authData = localStorage.getItem('busalert-auth');
      let refreshToken = null;
      if (authData) {
        try {
          refreshToken = JSON.parse(authData).state?.refreshToken;
        } catch (e) {
          // ignore parse errors
        }
      }

      if (!refreshToken || !refreshAction) {
        processQueue(err, null);
        isRefreshing = false;
        logoutAction?.();
        // Fallback if no logoutAction injected yet
        if (!logoutAction) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }

      try {
        const data = await refreshAction(refreshToken);
        if (data) {
          processQueue(null, data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return http(originalRequest);
        } else {
          // If refreshAction returns null (e.g., backend returned 401/400 for the refresh token),
          // we must clear the queue and trigger a logout.
          const errMessage = new Error('Token refresh failed');
          processQueue(errMessage, null);
          logoutAction?.();
          if (!logoutAction) window.location.href = '/login';
          return Promise.reject(errMessage);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logoutAction?.();
        if (!logoutAction) window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

const api = http;
export default api;

// ── Typed helpers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await api.delete<ApiResponse<T>>(url);
  return res.data.data;
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
