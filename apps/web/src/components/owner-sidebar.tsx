'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const ownerNavItems: NavItem[] = [
  { href: '/owner/dashboard', icon: 'grid_view', label: 'Dashboard' },
  { href: '/owner/operators', icon: 'badge', label: 'Operators' },
  { href: '/owner/trips', icon: 'directions_bus', label: 'Trip Monitoring' },
  { href: '/owner/logs', icon: 'history', label: 'Global Logs' },
  { href: '/owner/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
];

const operationsNavItems: NavItem[] = [
  { href: '/operator/routes', icon: 'route', label: 'Routes' },
  { href: '/operator/geo-library', icon: 'location_on', label: 'Geo Library' },
  { href: '/operator/templates', icon: 'bookmarks', label: 'Templates' },
  { href: '/operator/trips', icon: 'directions_bus', label: 'Trips' },
  { href: '/operator/monitor', icon: 'radar', label: 'Live Monitor' },
  { href: '/operator/resources', icon: 'inventory_2', label: 'Resources' },
  { href: '/operator/logs', icon: 'receipt_long', label: 'Alert Logs' },
];

const bottomNavItems: NavItem[] = [
  { href: '/owner/settings', icon: 'settings', label: 'Settings' },
  { href: '/support', icon: 'help_outline', label: 'Help Center' },
];

function OperationsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-72 z-[70] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0d1117 0%, #111827 100%)',
          borderRight: '1px solid #1e293b',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#6C63FF]">explore</span>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Operations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-[#F1F5F9] hover:bg-[#262a2f] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {operationsNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[0.75rem] font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-[#6C63FF]/20 text-[#F1F5F9] border-l-2 border-[#6C63FF]'
                    : 'text-[#94a3b8] hover:bg-[#1e293b]/80 hover:text-[#F1F5F9]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${
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

        {/* Footer */}
        <div className="border-t border-[#1e293b] px-4 py-3">
          <p className="text-[0.625rem] uppercase tracking-widest text-[#64748b] font-bold">
            Quick access to all operational tools
          </p>
        </div>
      </div>
    </>
  );
}

export default function OwnerSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [panelOpen, setPanelOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/owner/dashboard') return pathname === '/owner/dashboard' || pathname === '/owner';
    return pathname.startsWith(href);
  }

  return (
    <>
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
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4 no-scrollbar">
          <div>
            <h2 className="px-3 mb-2 text-[0.65rem] font-black uppercase tracking-widest text-[#64748b]">
              Owner Section
            </h2>
            <div className="space-y-0.5">
              {ownerNavItems.map((item) => {
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
            </div>
          </div>

          {/* Operations Card Button */}
          <div className="px-1">
            <button
              onClick={() => setPanelOpen(true)}
              className="w-full group relative overflow-hidden rounded-xl border border-[#6C63FF]/30 bg-gradient-to-br from-[#6C63FF]/20 via-[#6C63FF]/10 to-[#a3cbf2]/5 p-3 transition-all hover:border-[#6C63FF]/50 hover:from-[#6C63FF]/30 hover:via-[#6C63FF]/15 active:scale-[0.98]"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#6C63FF]/0 via-[#6C63FF]/10 to-[#6C63FF]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-[#a3cbf2]">explore</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[0.6875rem] font-black uppercase tracking-wider text-[#F1F5F9]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Operations
                    </p>
                    <p className="text-[0.5625rem] font-bold uppercase tracking-widest text-[#64748b] mt-0.5">
                      Routes · Templates · Geo
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#6C63FF] group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </div>
            </button>
          </div>
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

      {/* Operations Slide-out Panel */}
      <OperationsPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
