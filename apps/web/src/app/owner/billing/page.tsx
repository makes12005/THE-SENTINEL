'use client';
/**
 * Owner — Screen 6: Billing (Usage-based, UI only)
 * Shows current month trip count + estimated bill.
 * No payment integration in Sprint 8 — actual billing in Sprint 9.
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface OwnerSummary {
  total_operators:        number;
  active_trips:           number;
  total_passengers_today: number;
  alerts_sent_today:      number;
  failed_alerts_today:    number;
}

const RATE_PER_TRIP = 100; // ₹100 per trip

export default function OwnerBillingPage() {
  const { data: summary } = useQuery<OwnerSummary>({
    queryKey: ['owner-summary'],
    queryFn:  () => get<OwnerSummary>('/api/owner/summary'),
  });

  // Simulated billing numbers (Sprint 9 will use real billing)
  const now          = new Date();
  const monthName    = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const tripsThisMonth = 47; // placeholder — will come from billing API in Sprint 9
  const estimatedBill  = tripsThisMonth * RATE_PER_TRIP;

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-gradient-to-b from-[#181c20] to-transparent backdrop-blur-sm">
        <PageHeader title="Billing" subtitle="Usage & invoices" />
        <span className="text-xs bg-[#602a00]/40 text-[#ffb68b] border border-[#ffb68b]/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest">
          Invoice Pending
        </span>
      </header>

      <div className="p-8 space-y-6 max-w-3xl">
        {/* Current month summary */}
        <div className="bg-gradient-to-br from-[#181c20] to-[#0b3c5d]/30 rounded-2xl p-8 border border-[#a3cbf2]/10">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">
            Billing Period
          </p>
          <p className="text-2xl font-black text-[#e0e2e8] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {monthName}
          </p>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">Trips Run</p>
              <p className="text-4xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {String(tripsThisMonth).padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">Rate</p>
              <p className="text-4xl font-black text-[#a3cbf2]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                ₹{RATE_PER_TRIP}
              </p>
              <p className="text-xs text-[#8c9198] mt-1">per trip</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#c2c7ce] mb-1">Estimated Bill</p>
              <p className="text-4xl font-black text-[#ffb68b]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                ₹{estimatedBill.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Payment status */}
        <div className="bg-[#181c20] rounded-2xl p-6 flex gap-5 items-center border border-[#ffb68b]/20">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[#602a00]/40 flex items-center justify-center text-[#ffb68b]">
            <span className="material-symbols-outlined">receipt</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#e0e2e8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Invoice pending · ₹{estimatedBill.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-[#8c9198] mt-0.5">
              Payment integration will be enabled in Sprint 9. You will receive an invoice via email.
            </p>
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-[#ffb68b]/10 text-[#ffb68b] font-bold text-xs uppercase tracking-widest opacity-50 cursor-not-allowed border border-[#ffb68b]/20"
          >
            Pay Invoice
          </button>
        </div>

        {/* Rate card */}
        <div className="bg-[#181c20] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#e0e2e8] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pricing Plan — Usage Based
          </h2>
          <div className="space-y-3">
            {[
              { tier: '1 – 20 trips',   rate: '₹100 / trip', note: 'Standard'  },
              { tier: '21 – 100 trips',  rate: '₹85 / trip',  note: '15% off' },
              { tier: '100+ trips',      rate: '₹70 / trip',  note: '30% off' },
            ].map((row) => (
              <div key={row.tier} className="flex justify-between items-center bg-[#1c2024] px-5 py-4 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-[#e0e2e8]">{row.tier}</p>
                  <p className="text-xs text-[#8c9198]">{row.note}</p>
                </div>
                <p className="text-sm font-bold text-[#c4c0ff]">{row.rate}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8c9198] mt-4">
            Volume discounts applied automatically. No setup fee. Cancel anytime.
          </p>
        </div>

        {/* Upcoming */}
        <div className="bg-[#262a2f] rounded-2xl p-6 border border-[#c4c0ff]/10">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#c4c0ff] text-[20px]">rocket_launch</span>
            <p className="font-bold text-[#c4c0ff]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Sprint 9 — Payment Integration
            </p>
          </div>
          <p className="text-sm text-[#8c9198]">
            Razorpay / Stripe integration, downloadable PDF invoices, auto-debit setup,
            and transaction history will be live in the next sprint.
          </p>
        </div>
      </div>
    </div>
  );
}
