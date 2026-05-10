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
  { href: '/operator/routes',    icon: 'route',           label: 'Routes' },
  { href: '/operator/geo-library', icon: 'location_on',   label: '📍 Geo Library' },
  { href: '/operator/templates', icon: 'bookmarks',       label: 'Templates' },
  { href: '/operator/trips',     icon: 'directions_bus',  label: 'Trips' },
  { href: '/operator/monitor',   icon: 'radar',           label: 'Monitor' },
  { href: '/operator/resources', icon: 'inventory_2',     label: 'Resources' },
  { href: '/operator/logs',      icon: 'receipt_long',    label: 'Logs' },
];


export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#12161a] flex flex-col py-6 border-r border-[#ffffff0a] z-50">
      {/* Brand */}
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="text-[#a3cbf2]">
          <span className="material-symbols-outlined text-[28px]">track_changes</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-[#e0e2e8] tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            SENTINEL
          </h1>
          <p className="text-[0.625rem] uppercase tracking-[0.15em] text-[#8c9198] font-bold mt-0.5">
            TRANSIT COMMAND
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar px-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-[0.8125rem] uppercase tracking-wider font-bold transition-all ${
                isActive
                  ? 'bg-[#262a2f] text-[#a3cbf2]'
                  : 'text-[#8c9198] hover:text-[#e0e2e8] hover:bg-[#262a2f]/50'
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 px-3">
        {/* User info */}
        <div className="px-4 py-3.5 rounded-xl bg-[#1c2024] flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-[#0b3c5d] flex items-center justify-center text-[#a3cbf2] border border-[#a3cbf2]/20 overflow-hidden">
            {/* Using a placeholder avatar or icon */}
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#e0e2e8] truncate" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {user ? user.name : 'Alex Mercer'}
            </p>
            <p className="text-[0.6875rem] text-[#8c9198] truncate">
              {user ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Lead Operator'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[0.8125rem] uppercase tracking-wider font-bold text-[#8c9198] hover:text-[#ff7a00] hover:bg-[#ff7a00]/5 transition-all"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
