import { db } from '../../db';
import { trips, routes, auditLogs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '../../lib/shared-types';

/**
 * Logs a forbidden access attempt to the audit logs.
 */
export async function logForbiddenAccess(
  userId: string,
  tripId: string,
  action: string,
  metadata: Record<string, any> = {}
) {
  await db.insert(auditLogs).values({
    user_id: userId,
    action,
    entity_type: 'trip',
    entity_id: tripId,
    metadata: {
      ...metadata,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    },
  });
}

/**
 * Security helper to verify that a trip belongs to a specific agency.
 * Admin role bypasses this check and can access any trip.
 * 
 * @throws 403 Forbidden if access is denied
 * @returns The trip object if access is granted
 */
export async function verifyTripAgency(
  tripId: string,
  agencyId: string,
  userId: string,
  userRole: string
) {
  // 1. Admin bypass
  if (userRole === UserRole.ADMIN) {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);
    
    if (!trip) {
      throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    }
    return trip;
  }

  // 2. Agency check via Join
  const [result] = await db
    .select({
      trip: trips,
      agency_id: routes.agency_id
    })
    .from(trips)
    .innerJoin(routes, eq(trips.route_id, routes.id))
    .where(
      and(
        eq(trips.id, tripId),
        eq(routes.agency_id, agencyId)
      )
    )
    .limit(1);

  if (!result) {
    // Log unauthorized access attempt
    await logForbiddenAccess(userId, tripId, 'UNAUTHORIZED_TRIP_ACCESS_ATTEMPT', {
      attempted_agency_id: agencyId,
      user_role: userRole,
    });

    throw Object.assign(new Error('You do not have access to this trip'), { 
      statusCode: 403,
      code: 'FORBIDDEN'
    });
  }

  return result.trip;
}
