'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface NavItem {
  href:  string;
  icon:  string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/operator/dashboard', icon: 'dashboard',       label: 'Dashboard' },
  { href: '/operator/trips',     icon: 'directions_bus',  label: 'Trips' },
  { href: '/operator/routes',    icon: 'route',           label: 'Routes' },
  { href: '/operator/monitor',   icon: 'radar',           label: 'Live Monitor' },
  { href: '/operator/resources', icon: 'group',           label: 'Resources' },
  { href: '/operator/logs',      icon: 'receipt_long',    label: 'Logs' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#181c20] flex flex-col py-6 shadow-[40px_0_40px_rgba(0,0,0,0.15)] z-50">
      {/* Brand */}
      <div className="px-6 mb-10">
        <h1 className="text-xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          BusOps Control
        </h1>
        <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[#c2c7ce] opacity-60 mt-0.5">
          Sentinel System
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm uppercase tracking-wider font-medium transition-all ${
                isActive
                  ? 'bg-[#262a2f] text-[#a3cbf2] border-l-4 border-[#a3cbf2]'
                  : 'text-[#e0e2e8] opacity-60 hover:opacity-100 hover:bg-[#262a2f]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-[#42474e]/30 px-2 space-y-1">
        {/* User info */}
        {user && (
          <div className="mx-2 px-4 py-3 rounded-xl bg-[#1c2024] mb-2">
            <p className="text-xs font-bold text-[#a3cbf2] uppercase tracking-wider truncate">{user.name}</p>
            <p className="text-[0.6875rem] text-[#c2c7ce] opacity-60 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm uppercase tracking-wider text-[#e0e2e8] opacity-60 hover:opacity-100 hover:bg-[#262a2f] transition-all"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
