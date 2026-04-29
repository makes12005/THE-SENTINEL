'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminBillingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/wallet');
  }, [router]);

  return null;
}
