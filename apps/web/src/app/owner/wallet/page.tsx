'use client';
/**
 * Owner — Wallet Screen
 * Displays trip credit balance, usage stats, and transaction history.
 * Data: GET /api/owner/summary + GET /api/owner/wallet/transactions
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { PageHeader, TableSkeleton } from '@/components/ui';

interface OwnerSummary {
  trips_remaining:        number;
  trips_used_this_month:  number;
}

interface WalletTransaction {
  id: string;
  trips_amount: number;
  trips_remaining_after: number;
  type: 'trip_topup' | 'trip_deduction';
  description: string;
  created_at: string;
}

export default function OwnerWalletPage() {
  const { data: summary, isLoading: sumLoading } = useQuery<OwnerSummary>({
    queryKey: ['owner-summary'],
    queryFn:  () => get<OwnerSummary>('/api/owner/summary'),
  });

  const { data: txs, isLoading: txsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['owner-wallet-transactions'],
    queryFn:  () => get<WalletTransaction[]>('/api/owner/wallet/transactions'),
  });

  const isLowBalance = (summary?.trips_remaining ?? 0) <= 10;

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Trip Wallet" subtitle="Balance & Usage History" />
        {isLowBalance && summary && (
          <span className="text-[10px] bg-[#93000a] text-[#ffdad6] px-3 py-1 rounded-full font-black uppercase tracking-widest animate-pulse">
            Low Balance
          </span>
        )}
      </header>

      <div className="p-8 space-y-8 max-w-5xl">
        {/* Main Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#181c20] p-8 rounded-2xl border border-[#c4c0ff]/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
            </div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">Available Trips</p>
            <p className="text-6xl font-black text-[#c4c0ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {sumLoading ? '—' : String(summary?.trips_remaining ?? 0).padStart(2, '0')}
            </p>
            <p className="text-xs text-[#8c9198] mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Each trip deduction occurs when a trip is started.
            </p>
          </div>

          <div className="bg-[#181c20] p-8 rounded-2xl border border-[#a3cbf2]/10">
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">Trips Used (Current Month)</p>
            <p className="text-6xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {sumLoading ? '—' : String(summary?.trips_used_this_month ?? 0).padStart(2, '0')}
            </p>
            <p className="text-xs text-[#8c9198] mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">event_repeat</span>
              Resets on the 1st of every month at 00:00 IST.
            </p>
          </div>
        </div>

        {/* Low Balance Alert */}
        {isLowBalance && !sumLoading && (
          <div className="bg-[#93000a]/10 border border-[#ffb4ab]/20 p-6 rounded-2xl flex items-center gap-5">
            <div className="h-12 w-12 rounded-full bg-[#93000a] flex items-center justify-center text-[#ffdad6] shrink-0">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <p className="font-bold text-[#ffb4ab]" style={{ fontFamily: 'Manrope, sans-serif' }}>Low balance alert</p>
              <p className="text-sm text-[#c2c7ce]">Your agency has {summary?.trips_remaining} trips remaining. Please contact the platform admin to top up your credits to avoid service interruption.</p>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Transaction History
          </h2>
          <div className="bg-[#181c20] rounded-2xl border border-[#c2c7ce]/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1c2024] border-b border-[#c2c7ce]/10">
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-widest text-[#8c9198]">Date & Time</th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-widest text-[#8c9198]">Description</th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-widest text-[#8c9198] text-right">Amount</th>
                  <th className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-widest text-[#8c9198] text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {txsLoading ? (
                  <tr><td colSpan={4} className="p-0"><TableSkeleton rows={5} /></td></tr>
                ) : txs?.length ? (
                  txs.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#c2c7ce]/5 hover:bg-[#1c2024]/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#e0e2e8]">
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#e0e2e8] font-medium">{tx.description}</p>
                        <p className="text-[10px] text-[#8c9198] uppercase tracking-tighter">{tx.type.replace('_', ' ')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${tx.trips_amount > 0 ? 'text-[#7dffd4]' : 'text-[#ffb4ab]'}`}>
                          {tx.trips_amount > 0 ? `+${tx.trips_amount}` : tx.trips_amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#c4c0ff]">
                        {tx.trips_remaining_after}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#8c9198]">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
