import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '../../db';
import { auditLogs, routes, trips, users } from '../../db/schema';
import { emitSocketEvent } from '../../lib/socket';

export async function handleOperatorDeactivation(
  operatorId: string,
  agencyId: string,
  actorId: string
): Promise<{ orphaned_trip_ids: string[]; operator_name: string }> {
  const [operator] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, operatorId), eq(users.agency_id, agencyId), eq(users.role, 'operator')))
    .limit(1);

  if (!operator) {
    return { orphaned_trip_ids: [], operator_name: '' };
  }

  const orphanedTrips = await db
    .select({
      id: trips.id,
      route_name: routes.name,
      scheduled_date: trips.scheduled_date,
    })
    .from(trips)
    .innerJoin(routes, eq(routes.id, trips.route_id))
    .where(and(eq(routes.agency_id, agencyId), eq(trips.assigned_operator_id, operatorId), ne(trips.status, 'completed')));

  if (orphanedTrips.length === 0) {
    return { orphaned_trip_ids: [], operator_name: operator.name };
  }

  const orphanedIds = orphanedTrips.map((trip) => trip.id);

  await db
    .update(trips)
    .set({ assigned_operator_id: null })
    .where(inArray(trips.id, orphanedIds));

  await db.insert(auditLogs).values(
    orphanedTrips.map((trip) => ({
      user_id: actorId,
      action: 'TRIP_UNASSIGNED',
      entity_type: 'trip',
      entity_id: trip.id,
      metadata: {
        agency_id: agencyId,
        previous_operator_id: operatorId,
        previous_operator_name: operator.name,
      },
    }))
  );

  for (const trip of orphanedTrips) {
    await emitSocketEvent(`agency:${agencyId}`, 'trip_unassigned', {
      tripId: trip.id,
      tripName: trip.route_name,
      previousOperatorName: operator.name,
    });
  }

  return {
    orphaned_trip_ids: orphanedIds,
    operator_name: operator.name,
  };
}
