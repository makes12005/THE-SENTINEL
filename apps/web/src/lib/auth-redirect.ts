export const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  owner: '/owner/dashboard',
  operator: '/operator/dashboard',
  driver: '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

const ACCESS_CODE_DONE_PREFIX = 'access_code_done_';

export function markAccessCodeCompleted(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(`${ACCESS_CODE_DONE_PREFIX}${userId}`, '1');
}

export function hasCompletedAccessCode(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  return localStorage.getItem(`${ACCESS_CODE_DONE_PREFIX}${userId}`) === '1';
}

export function redirectPathForRole(role?: string | null): string {
  if (!role) return '/access-code';
  return ROLE_REDIRECTS[role] ?? '/access-code';
}

export function redirectPathForUser(user?: { id?: string | null; role?: string | null } | null): string {
  if (!user?.role) return '/access-code';
  if (user.role !== 'passenger') return redirectPathForRole(user.role);
  return hasCompletedAccessCode(user.id ?? null) ? '/operator/dashboard' : '/access-code';
}
