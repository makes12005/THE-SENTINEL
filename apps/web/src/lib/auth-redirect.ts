export const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  owner: '/owner/dashboard',
  operator: '/operator/dashboard',
  driver: '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

export function redirectPathForRole(role?: string | null): string {
  if (!role) return '/access-code';
  return ROLE_REDIRECTS[role] ?? '/access-code';
}
