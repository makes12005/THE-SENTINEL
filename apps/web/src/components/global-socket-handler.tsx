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

    const onAlertManualRequired = (payload: { tripId: string; routeName: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast(
        (t) => (
          <div
            className="cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/operator/monitor');
            }}
          >
            <strong>Manual Alert Required</strong>
            <p className="text-xs mt-1">
              Trip "{payload.routeName || payload.tripId}" needs attention. Click to monitor.
            </p>
          </div>
        ),
        {
          duration: 10000,
          icon: '🔔',
          style: { background: '#1c1206', color: '#FF7A00', border: '1px solid rgba(255,122,0,0.3)' },
        }
      );
    };

    const onWalletLow = (payload: { balance: number; threshold: number }) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast(
        (t) => (
          <div
            className="cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/owner/wallet');
            }}
          >
            <strong>Wallet Balance Low</strong>
            <p className="text-xs mt-1">
              Balance: ₹{payload.balance}. Threshold: ₹{payload.threshold}. Click to recharge.
            </p>
          </div>
        ),
        {
          duration: 10000,
          icon: '💰',
          style: { background: '#1c1206', color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)' },
        }
      );
    };

    const onConductorOffline = (payload: { tripId: string; conductorId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast(
        (t) => (
          <div
            className="cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/operator/monitor');
            }}
          >
            <strong>Conductor Offline</strong>
            <p className="text-xs mt-1">
              Trip {payload.tripId.slice(0, 8)} conductor disconnected. Click to monitor.
            </p>
          </div>
        ),
        {
          duration: 8000,
          icon: '⚠️',
          style: { background: '#1c1206', color: '#ffb4ab', border: '1px solid rgba(255,180,171,0.3)' },
        }
      );
    };

    socket.on('trip_assigned', onTripAssigned);
    socket.on('trip_expired', onTripExpired);
    socket.on('alert_manual_required', onAlertManualRequired);
    socket.on('wallet_low', onWalletLow);
    socket.on('conductor_offline', onConductorOffline);

    return () => {
      socket.off('trip_assigned', onTripAssigned);
      socket.off('trip_expired', onTripExpired);
      socket.off('alert_manual_required', onAlertManualRequired);
      socket.off('wallet_low', onWalletLow);
      socket.off('conductor_offline', onConductorOffline);
    };
  }, [user, router, queryClient]);

  return null;
}
