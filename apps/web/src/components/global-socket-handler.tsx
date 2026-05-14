'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';

export default function GlobalSocketHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    // Only connect global handler for roles that manage trips
    if (!user || !['owner', 'operator'].includes(user.role)) return;

    const socket = getSocket();

    const onTripAssigned = (payload: { tripId: string; tripName: string; assignedBy: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(
        (t) => (
          <div
            className="cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/operator/trips');
            }}
          >
            <strong>Trip Assigned</strong>
            <p className="text-xs mt-1">
              {payload.tripName} was assigned by {payload.assignedBy}. Click to view.
            </p>
          </div>
        ),
        { duration: 8000 }
      );
    };

    const onTripExpired = (payload: { tripId: string; routeName: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast(
        (t) => (
          <div
            className="cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/operator/trips');
            }}
          >
            <strong>Trip Expired</strong>
            <p className="text-xs mt-1">
              Trip "{payload.routeName || payload.tripId}" has expired. Click to view.
            </p>
          </div>
        ),
        {
          duration: 8000,
          icon: '⚠️',
          style: { background: '#1c1206', color: '#FF7A00', border: '1px solid rgba(255,122,0,0.3)' },
        }
      );
    };

    socket.on('trip_assigned', onTripAssigned);
    socket.on('trip_expired', onTripExpired);

    return () => {
      socket.off('trip_assigned', onTripAssigned);
      socket.off('trip_expired', onTripExpired);
    };
  }, [user, router, queryClient]);

  return null;
}
