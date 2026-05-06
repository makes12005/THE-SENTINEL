'use client';
/**
 * Owner Sidebar — "The Sentinel / Transit Authority" style.
 * Matches reference image 1 exactly: brand, nav items, New Dispatch CTA, user card.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/owner/dashboard', icon: 'grid_view',               label: 'Overview'      },
  { href: '/owner/operators', icon: 'badge',                 label: 'Operators'     },
  { href: '/owner/trips',     icon: 'directions_bus',       label: 'Fleet / Trips' },
  { href: '/owner/logs',      icon: 'history',               label: 'Logs'          },
  { href: '/owner/resources', icon: 'warehouse',            label: 'Resources'    },
  { href: '/owner/wallet',    icon: 'account_balance_wallet', label: 'Trip Wallet' },
  { href: '/owner/schedules', icon: 'calendar_month',       label: 'Schedules'     },
  { href: '/owner/analytics', icon: 'insights',              label: 'Analytics'    },
];

const bottomNavItems: NavItem[] = [
  { href: '/owner/settings', icon: 'settings',     label: 'Settings'     },
  { href: '/support',        icon: 'help_outline', label: 'Help Center'  },
];

export default function OwnerSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  function isActive(href: string) {
    if (href === '/owner/dashboard') return pathname === '/owner/dashboard' || pathname === '/owner';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen w-52 flex-col"
      style={{
        background: 'linear-gradient(180deg, #0d1117 0%, #111827 100%)',
        borderRight: '1px solid #1e293b',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Brand */}
      <div className="px-5 pb-5 pt-6">
        <h1
          className="text-base font-black uppercase tracking-wider text-[#F1F5F9]"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          VELOX OPS
        </h1>
        <p className="mt-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
          TERMINAL A-1
        </p>
      </div>

      {/* New Dispatch CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/owner/operators?add=true"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b0d4ff] py-3 text-[0.6875rem] font-black uppercase tracking-widest text-[#0F172A] transition-all hover:brightness-110 active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Operator
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 no-scrollbar">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-[#1e293b] text-[#F1F5F9]'
                  : 'text-[#475569] hover:bg-[#1e293b]/50 hover:text-[#94a3b8]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-colors ${
                  active ? 'text-[#6C63FF]' : ''
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="border-t border-[#1e293b] px-2 py-3 space-y-0.5">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-[#1e293b] text-[#F1F5F9]'
                  : 'text-[#475569] hover:bg-[#1e293b]/50 hover:text-[#94a3b8]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* User card / Logout */}
        {user && (
          <button
            onClick={logout}
            title="Click to sign out"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[#475569] transition-all hover:bg-[#1e293b]/50 hover:text-[#94a3b8] w-full text-left"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}
