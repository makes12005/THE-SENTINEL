/**
 * TemplatesService — CRUD for trip templates
 *
 * A template is a pre-configured trip setup (route + bus + staff + times)
 * that operators can reuse daily to create trips quickly.
 */

import { db } from '../../db';
import { tripTemplates, routes, buses, users, stops, trips } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { CreateTemplateRequest } from '../../lib/shared-types';

export class TemplatesService {
  // ── Create Template ───────────────────────────────────────────────────────
  static async createTemplate(
    agencyId: string,
    createdBy: string,
    payload: CreateTemplateRequest
  ) {
    // Ensure name is unique within agency
    const [existing] = await db
      .select({ id: tripTemplates.id })
      .from(tripTemplates)
      .where(
        and(
          eq(tripTemplates.agency_id, agencyId),
          eq(tripTemplates.name, payload.name),
          eq(tripTemplates.is_active, true)
        )
      )
      .limit(1);

    if (existing) {
      throw Object.assign(
        new Error(`Template "${payload.name}" already exists in your agency`),
        { statusCode: 409, code: 'TEMPLATE_ALREADY_EXISTS' }
      );
    }

    // Verify route belongs to this agency
    const [route] = await db
      .select({ id: routes.id })
      .from(routes)
      .where(and(eq(routes.id, payload.route_id), eq(routes.agency_id, agencyId)))
      .limit(1);

    if (!route) {
      throw Object.assign(
        new Error('Route not found or does not belong to your agency'),
        { statusCode: 404, code: 'ROUTE_NOT_FOUND' }
      );
    }

    if (payload.bus_id) {
      const [bus] = await db
        .select({ id: buses.id, agency_id: buses.agency_id })
        .from(buses)
        .where(eq(buses.id, payload.bus_id))
        .limit(1);
      if (!bus || bus.agency_id !== agencyId) {
        throw Object.assign(new Error('Bus not found or does not belong to your agency'), { statusCode: 422 });
      }
    }

    if (payload.conductor_id) {
      const [conductor] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role })
        .from(users)
        .where(eq(users.id, payload.conductor_id))
        .limit(1);
      if (!conductor || conductor.agency_id !== agencyId || conductor.role !== 'conductor') {
        throw Object.assign(new Error('Conductor must belong to your agency'), { statusCode: 422 });
      }
    }

    if (payload.driver_id) {
      const [driver] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role })
        .from(users)
        .where(eq(users.id, payload.driver_id))
        .limit(1);
      if (!driver || driver.agency_id !== agencyId || driver.role !== 'driver') {
        throw Object.assign(new Error('Driver must belong to your agency'), { statusCode: 422 });
      }
    }

    const [template] = await db
      .insert(tripTemplates)
      .values({
        agency_id: agencyId,
        name: payload.name,
        route_id: payload.route_id,
        bus_id: payload.bus_id ?? null,
        conductor_id: payload.conductor_id ?? null,
        driver_id: payload.driver_id ?? null,
        departure_time: payload.departure_time ?? null,
        arrival_time: payload.arrival_time ?? null,
        notes: payload.notes ?? null,
        is_active: true,
        created_by: createdBy,
      })
      .returning();

    return this.getTemplate(template.id, agencyId);
  }

  // ── List Templates ────────────────────────────────────────────────────────
  static async listTemplates(agencyId: string) {
    const rows = await db.execute<{
      id: string;
      name: string;
      route_id: string;
      route_name: string;
      from_city: string;
      to_city: string;
      bus_id: string | null;
      bus_number_plate: string | null;
      conductor_id: string | null;
      conductor_name: string | null;
      driver_id: string | null;
      driver_name: string | null;
      departure_time: string | null;
      arrival_time: string | null;
      notes: string | null;
      is_active: boolean;
      created_at: string;
    }>(sql`
      SELECT
        t.id,
        t.name,
        t.route_id,
        r.name         AS route_name,
        r.from_city,
        r.to_city,
        t.bus_id,
        b.number_plate AS bus_number_plate,
        t.conductor_id,
        c.name         AS conductor_name,
        t.driver_id,
        d.name         AS driver_name,
        t.departure_time,
        t.arrival_time,
        t.notes,
        t.is_active,
        t.created_at::text
      FROM trip_templates t
      JOIN routes r ON r.id = t.route_id
      LEFT JOIN buses b ON b.id = t.bus_id
      LEFT JOIN users c ON c.id = t.conductor_id
      LEFT JOIN users d ON d.id = t.driver_id
      WHERE t.agency_id = ${agencyId} AND t.is_active = true
      ORDER BY t.created_at ASC
    `);

    return rows;
  }

  // ── Get Single Template ───────────────────────────────────────────────────
  static async getTemplate(templateId: string, agencyId: string) {
    const rows = await db.execute<{
      id: string;
      name: string;
      route_id: string;
      route_name: string;
      from_city: string;
      to_city: string;
      bus_id: string | null;
      bus_number_plate: string | null;
      bus_model: string | null;
      conductor_id: string | null;
      conductor_name: string | null;
      conductor_phone: string | null;
      driver_id: string | null;
      driver_name: string | null;
      driver_phone: string | null;
      departure_time: string | null;
      arrival_time: string | null;
      notes: string | null;
      is_active: boolean;
      created_at: string;
    }>(sql`
      SELECT
        t.id,
        t.name,
        t.route_id,
        r.name         AS route_name,
        r.from_city,
        r.to_city,
        t.bus_id,
        b.number_plate AS bus_number_plate,
        b.model        AS bus_model,
        t.conductor_id,
        c.name         AS conductor_name,
        c.phone        AS conductor_phone,
        t.driver_id,
        d.name         AS driver_name,
        d.phone        AS driver_phone,
        t.departure_time,
        t.arrival_time,
        t.notes,
        t.is_active,
        t.created_at::text
      FROM trip_templates t
      JOIN routes r ON r.id = t.route_id
      LEFT JOIN buses b ON b.id = t.bus_id
      LEFT JOIN users c ON c.id = t.conductor_id
      LEFT JOIN users d ON d.id = t.driver_id
      WHERE t.id = ${templateId} AND t.agency_id = ${agencyId}
      LIMIT 1
    `);

    if (rows.length === 0) {
      throw Object.assign(
        new Error('Template not found or does not belong to your agency'),
        { statusCode: 404, code: 'TEMPLATE_NOT_FOUND' }
      );
    }

    const template = rows[0];

    const routeStops = await db
      .select({
        id: stops.id,
        name: stops.name,
        sequence_number: stops.sequence_number,
        trigger_radius_km: stops.trigger_radius_km,
      })
      .from(stops)
      .where(eq(stops.route_id, template.route_id))
      .orderBy(stops.sequence_number);

    const stopCoords = await db.execute<{ id: string; lat: string; lng: string }>(sql`
      SELECT id, ST_Y(coordinates::geometry)::text AS lat, ST_X(coordinates::geometry)::text AS lng
      FROM stops
      WHERE route_id = ${template.route_id}
    `);

    const coordMap = new Map(stopCoords.map((c) => [c.id, c]));
    const stopsWithCoords = routeStops.map((s) => {
      const c = coordMap.get(s.id);
      return {
        ...s,
        latitude: c ? Number(c.lat) : null,
        longitude: c ? Number(c.lng) : null,
      };
    });

    return {
      ...template,
      route: {
        id: template.route_id,
        name: template.route_name,
        from_city: template.from_city,
        to_city: template.to_city,
        stops: stopsWithCoords,
      },
    };
  }

  // ── Update Template ───────────────────────────────────────────────────────
  static async updateTemplate(
    templateId: string,
    agencyId: string,
    payload: Partial<CreateTemplateRequest>
  ) {
    const [existing] = await db
      .select({ id: tripTemplates.id, name: tripTemplates.name })
      .from(tripTemplates)
      .where(
        and(eq(tripTemplates.id, templateId), eq(tripTemplates.agency_id, agencyId))
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error('Template not found'), { statusCode: 404 });
    }

    // Check name uniqueness if name is changing
    if (payload.name && payload.name !== existing.name) {
      const [dupe] = await db
        .select({ id: tripTemplates.id })
        .from(tripTemplates)
        .where(
          and(
            eq(tripTemplates.agency_id, agencyId),
            eq(tripTemplates.name, payload.name),
            eq(tripTemplates.is_active, true),
            sql`${tripTemplates.id} != ${templateId}` as any
          )
        )
        .limit(1);

      if (dupe) {
        throw Object.assign(
          new Error(`Template "${payload.name}" already exists in your agency`),
          { statusCode: 409, code: 'TEMPLATE_ALREADY_EXISTS' }
        );
      }
    }

    if (payload.route_id) {
      const [route] = await db
        .select({ id: routes.id })
        .from(routes)
        .where(and(eq(routes.id, payload.route_id), eq(routes.agency_id, agencyId)))
        .limit(1);
      if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
      }
    }

    if ('bus_id' in payload && payload.bus_id) {
      const [bus] = await db
        .select({ id: buses.id, agency_id: buses.agency_id })
        .from(buses)
        .where(eq(buses.id, payload.bus_id))
        .limit(1);
      if (!bus || bus.agency_id !== agencyId) {
        throw Object.assign(new Error('Bus not found or does not belong to your agency'), { statusCode: 422 });
      }
    }

    if ('conductor_id' in payload && payload.conductor_id) {
      const [conductor] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role })
        .from(users)
        .where(eq(users.id, payload.conductor_id))
        .limit(1);
      if (!conductor || conductor.agency_id !== agencyId || conductor.role !== 'conductor') {
        throw Object.assign(new Error('Conductor must belong to your agency'), { statusCode: 422 });
      }
    }

    if ('driver_id' in payload && payload.driver_id) {
      const [driver] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role })
        .from(users)
        .where(eq(users.id, payload.driver_id))
        .limit(1);
      if (!driver || driver.agency_id !== agencyId || driver.role !== 'driver') {
        throw Object.assign(new Error('Driver must belong to your agency'), { statusCode: 422 });
      }
    }

    const updateValues: Partial<typeof tripTemplates.$inferInsert> = {};
    if (payload.name !== undefined) updateValues.name = payload.name;
    if (payload.route_id !== undefined) updateValues.route_id = payload.route_id;
    if ('bus_id' in payload) updateValues.bus_id = payload.bus_id ?? null;
    if ('conductor_id' in payload) updateValues.conductor_id = payload.conductor_id ?? null;
    if ('driver_id' in payload) updateValues.driver_id = payload.driver_id ?? null;
    if ('departure_time' in payload) updateValues.departure_time = payload.departure_time ?? null;
    if ('arrival_time' in payload) updateValues.arrival_time = payload.arrival_time ?? null;
    if ('notes' in payload) updateValues.notes = payload.notes ?? null;

    const [updated] = await db
      .update(tripTemplates)
      .set(updateValues)
      .where(eq(tripTemplates.id, templateId))
      .returning();

    return this.getTemplate(updated.id, agencyId);
  }

  // ── Delete Template (soft) ────────────────────────────────────────────────
  static async deleteTemplate(templateId: string, agencyId: string) {
    const [upcomingTrip] = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.template_id, templateId), eq(trips.status, 'scheduled')))
      .limit(1);
    if (upcomingTrip) {
      throw Object.assign(new Error('Cannot delete template with upcoming trips'), {
        statusCode: 409,
        code: 'TEMPLATE_IN_USE',
      });
    }

    const [existing] = await db
      .select({ id: tripTemplates.id })
      .from(tripTemplates)
      .where(
        and(eq(tripTemplates.id, templateId), eq(tripTemplates.agency_id, agencyId))
      )
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error('Template not found'), { statusCode: 404 });
    }

    await db
      .update(tripTemplates)
      .set({ is_active: false })
      .where(eq(tripTemplates.id, templateId));

    return { deleted: true, id: templateId };
  }
}
