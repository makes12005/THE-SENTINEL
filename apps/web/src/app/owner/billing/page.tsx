import { redirect } from 'next/navigation';

/** Billing/revenue belongs to admin; agency owners use trip credits on Trip Wallet only. */
export default function OwnerBillingPage() {
  redirect('/owner/wallet');
}
