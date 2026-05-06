'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { formatIstDateTime } from '@/lib/format-ist';

interface OwnerWallet {
  trips_remaining: number;
  trips_used_this_month: number;
  rate_trips_per_completed_trip: number;
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
  const wallet = useQuery<OwnerWallet>({
    queryKey: ['owner-wallet'],
    queryFn: () => get('/api/owner/wallet'),
  });
  const txs = useQuery<WalletTransaction[]>({
    queryKey: ['owner-wallet-transactions'],
    queryFn: () => get('/api/owner/wallet/transactions'),
  });

  const tripsRemaining = wallet.data?.trips_remaining ?? 0;
  const tripsUsed = wallet.data?.trips_used_this_month ?? 0;
  const lowBalance = tripsRemaining > 0 && tripsRemaining < 5;
  const emptyWallet = tripsRemaining === 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#475569]">Agency Trip Credits</p>
        <h1 className="text-2xl font-black">TRIP WALLET</h1>
      </div>

      {(lowBalance || emptyWallet) && !wallet.isLoading && (
        <div
          className={`mb-6 rounded-2xl border p-5 ${emptyWallet ? 'border-[#ffb4ab]/40 bg-[#93000a]/20' : 'border-[#FF7A00]/40 bg-[#FF7A00]/10'}`}
        >
          <p className={`text-sm font-bold ${emptyWallet ? 'text-[#ffb4ab]' : 'text-[#FF7A00]'}`}>
            {emptyWallet
              ? 'Wallet empty. New trips are blocked until top-up.'
              : `Low balance warning: ${tripsRemaining} trips remaining.`}
          </p>
          <p className="mt-1 text-xs text-[#c2c7ce]">Contact admin to top up trip credits.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
          <p className="text-[0.625rem] uppercase tracking-widest text-[#475569]">Trips remaining</p>
          <p className="text-5xl font-black text-[#c4c0ff]">{wallet.isLoading ? '—' : tripsRemaining}</p>
        </div>
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
          <p className="text-[0.625rem] uppercase tracking-widest text-[#475569]">Trips used this month</p>
          <p className="text-5xl font-black text-[#a3cbf2]">{wallet.isLoading ? '—' : tripsUsed}</p>
        </div>
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6">
          <p className="text-[0.625rem] uppercase tracking-widest text-[#475569]">Rate per completed trip</p>
          <p className="text-5xl font-black text-[#7dffd4]">1</p>
          <p className="text-xs text-[#8c9198]">credit per completed trip</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
        <h2 className="mb-4 text-lg font-bold">Transaction history</h2>
        {txs.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-[#1e293b]/50 animate-pulse" />
            ))}
          </div>
        ) : (txs.data ?? []).length === 0 ? (
          <p className="text-sm text-[#8c9198]">No transactions found.</p>
        ) : (
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-[0.6875rem] uppercase tracking-widest text-[#8c9198]">
                <th className="px-4">Date</th>
                <th className="px-4">Type</th>
                <th className="px-4 text-right">Trips count</th>
                <th className="px-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(txs.data ?? []).map((tx) => (
                <tr key={tx.id} className="bg-[#181c20]">
                  <td className="rounded-l-xl px-4 py-3">{formatIstDateTime(tx.created_at)}</td>
                  <td className="px-4 py-3">{tx.type.replace('_', ' ')}</td>
                  <td className={`px-4 py-3 text-right font-black ${tx.trips_amount >= 0 ? 'text-[#7dffd4]' : 'text-[#ffb4ab]'}`}>
                    {tx.trips_amount > 0 ? `+${tx.trips_amount}` : tx.trips_amount}
                  </td>
                  <td className="rounded-r-xl px-4 py-3 text-right">{tx.trips_remaining_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
