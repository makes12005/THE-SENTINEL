import { db } from '../../db';
import { conductorLocations, trips } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { LocationUpdateRequest } from '@busalert/shared-types';

/** Converts lat/lng to PostGIS EWKT. POINT takes (longitude latitude). */
export function toEWKT(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export class LocationService {
  /**
   * Saves a GPS ping from the conductor to conductor_locations.
   * Returns the new record's id.
   */
  static async save(
    tripId: string,
    conductorId: string,
    payload: LocationUpdateRequest
  ): Promise<string> {
    const lat = payload.lat!;
    const lng = payload.lng!;
    const battery_level = payload.battery_level;
    const accuracy_meters = payload.accuracy_meters;
    const locationInsert: typeof conductorLocations.$inferInsert = {
      trip_id: tripId,
      conductor_id: conductorId,
      coordinates: toEWKT(lat, lng),
      battery_level: battery_level !== undefined ? String(battery_level) : null,
      accuracy_meters: accuracy_meters !== undefined ? String(accuracy_meters) : null,
      recorded_at: new Date(),
    };

    const [saved] = await db
      .insert(conductorLocations)
      .values(locationInsert)
      .returning({ id: conductorLocations.id });

    return saved.id;
  }

  /**
   * Validates that the conductor is assigned to this trip AND the trip is active.
   * Throws a shaped error (with statusCode) if validation fails.
   */
  static async assertConductorOwnsActiveTrip(
    tripId: string,
    conductorId: string
  ): Promise<void> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip) {
      throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    }
    if (trip.conductor_id !== conductorId) {
      throw Object.assign(new Error('You are not assigned to this trip'), { statusCode: 403 });
    }
    if (trip.status !== 'active') {
      throw Object.assign(new Error('Trip is not active'), { statusCode: 409 });
    }
  }
}
