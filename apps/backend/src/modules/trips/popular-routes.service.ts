import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { popularRoutes, routes, stops } from '../../db/schema';

function toEWKT(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function makeUniqueRouteName(baseName: string, existingNames: string[]) {
  const existing = new Set(existingNames.map((name) => name.toLowerCase()));
  if (!existing.has(baseName.toLowerCase())) return baseName;

  let suffix = 2;
  let candidate = `${baseName} ${suffix}`;
  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseName} ${suffix}`;
  }
  return candidate;
}

export async function clonePopularRouteToAgency(popularRouteId: string, agencyId: string, userId: string) {
  const [template] = await db
    .select()
    .from(popularRoutes)
    .where(and(eq(popularRoutes.id, popularRouteId), eq(popularRoutes.is_approved, true)))
    .limit(1);

  if (!template) {
    throw Object.assign(new Error('Popular route not found or not approved'), {
      statusCode: 404,
      code: 'POPULAR_ROUTE_NOT_FOUND',
    });
  }

  const existingRoutes = await db
    .select({ name: routes.name })
    .from(routes)
    .where(eq(routes.agency_id, agencyId));

  const [createdRoute] = await db
    .insert(routes)
    .values({
      agency_id: agencyId,
      name: makeUniqueRouteName(template.name, existingRoutes.map((route) => route.name)),
      from_city: template.from_city,
      to_city: template.to_city,
      is_published: false,
      source: 'popular',
      created_by: userId,
    })
    .returning();

  const templateStops = Array.isArray(template.stops) ? template.stops as Array<any> : [];
  if (templateStops.length > 0) {
    await db.insert(stops).values(
      templateStops.map((stop, index) => ({
        route_id: createdRoute.id,
        name: String(stop.name ?? `Stop ${index + 1}`),
        sequence_number: Number(stop.sequence ?? index + 1),
        coordinates: toEWKT(Number(stop.lat), Number(stop.lng)),
        trigger_radius_km: '10',
      }))
    );
  }

  await db
    .update(popularRoutes)
    .set({ use_count: sql`${popularRoutes.use_count} + 1` })
    .where(eq(popularRoutes.id, popularRouteId));

  return createdRoute;
}
