import { redirect } from 'next/navigation';

/** root /owner → redirect to /owner/dashboard */
export default function OwnerRootPage() {
  redirect('/owner/dashboard');
}
