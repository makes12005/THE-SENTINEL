/**
 * Takeover Service — Sprint 6
 *
 * PUT /api/trips/:id/takeover
 * - Driver role only
 * - Driver must belong to the same agency as the trip
 * - Sets trip.conductor_id = driver's userId (driver takes over conductor role)
 * - Emits Socket.IO: conductor_replaced to all trip participants
 * - Logs to audit_logs
 */

import { db } from '../../db';
import { trips, users, auditLogs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class TakeoverService {

  static async takeoverTrip(tripId: string, driverId: string, fastify: any) {
    // 1. Load the trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip) {
      throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    }

    // 2. Trip must be active to be taken over
    if (trip.status !== 'active') {
      throw Object.assign(
        new Error('Trip is not active — takeover only allowed during an active trip'),
        { statusCode: 409 }
      );
    }

    // 3. Load driver — verify agency match with trip
    const [driver] = await db
      .select({ id: users.id, name: users.name, agency_id: users.agency_id, role: users.role })
      .from(users)
      .where(eq(users.id, driverId))
      .limit(1);

    if (!driver) {
      throw Object.assign(new Error('Driver not found'), { statusCode: 404 });
    }

    if (driver.role !== 'driver') {
      throw Object.assign(new Error('Only users with driver role can take over a trip'), { statusCode: 403 });
    }

    // 4. Verify driver belongs to same agency as the trip's operator
    const [tripOperator] = await db
      .select({ agency_id: users.agency_id })
      .from(users)
      .where(eq(users.id, trip.operator_id))
      .limit(1);

    if (tripOperator && tripOperator.agency_id !== driver.agency_id) {
      throw Object.assign(new Error('Driver does not belong to the same agency as this trip'), { statusCode: 403 });
    }

    // 5. Persist: set conductor_id = driver's userId
    const previousConductorId = trip.conductor_id;

    const [updatedTrip] = await db
      .update(trips)
      .set({ conductor_id: driverId })
      .where(eq(trips.id, tripId))
      .returning();

    // 6. Audit log
    await db.insert(auditLogs).values({
      user_id: driverId,
      action: 'TRIP_TAKEOVER',
      resource_type: 'trip',
      resource_id: tripId,
      metadata: JSON.stringify({
        previous_conductor_id: previousConductorId,
        driver_id: driverId,
        driver_name: driver.name,
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      }),
    });

    // 7. Emit Socket.IO to all trip participants
    try {
      fastify.io.to(`trip:${tripId}`).emit('conductor_replaced', {
        tripId,
        newConductorId: driverId,
        newConductorName: driver.name,
        previousConductorId,
        takenOverAt: new Date().toISOString(),
      });
    } catch (e) {
      fastify.log.warn(`[Takeover] Socket emit failed for trip ${tripId}: ${e}`);
    }

    return {
      trip: updatedTrip,
      driver: {
        id: driver.id,
        name: driver.name,
      },
      previousConductorId,
      message: 'Takeover successful. Driver now has conductor permissions for this trip.',
    };
  }
}
