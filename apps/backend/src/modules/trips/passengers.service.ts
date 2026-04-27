/**
 * PassengersService
 *
 * Handles CSV / xlsx upload for bulk passenger ingestion.
 * Rules (enforced before any DB insert):
 *  - Max 100 passengers per trip
 *  - Every row must have valid name, E.164 phone, stop_name matching route stop
 *  - Duplicate phone within same trip → rejected
 *  - Any validation error → reject entire file, return row-by-row report
 *  - On success → single transaction bulk insert
 */

import { db }  from '../../db';
import { trips, stops, tripPassengers } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import {
  PassengerRowSchema,
  PassengerRowError,
  UploadPassengersResponse,
} from '../../lib/shared-types';
import { ZodIssue } from 'zod';

const MAX_PASSENGERS = 100;
const E164_RE = /^\+91\d{10}$/;

// ── Parse raw buffer → rows array ────────────────────────────────────────────
function parseFile(
  buffer: Buffer,
  mimetype: string,
  originalname: string
): Array<Record<string, string>> {
  const ext = originalname.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || mimetype === 'text/csv') {
    const records: Array<Record<string, string>> = csvParse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  }

  // xlsx / xls
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    defval: '',
    raw: false,
  });
  return rows;
}

export async function uploadPassengers(
  tripId: string,
  operatorAgencyId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalname: string
): Promise<UploadPassengersResponse> {

  // ── 0. Verify trip belongs to operator's agency ──────────────────────────
  const [trip] = await db
    .select({ id: trips.id, route_id: trips.route_id, status: trips.status })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

  // Verify operator's agency owns the route (via join)
  const routeRows = Array.from(await db.execute<{ agency_id: string }>(
    sql`SELECT agency_id FROM routes WHERE id = ${trip.route_id} LIMIT 1`
  ));
  if (!routeRows[0] || routeRows[0].agency_id !== operatorAgencyId) {
    throw Object.assign(new Error('Trip does not belong to your agency'), { statusCode: 403 });
  }

  // ── 1. Parse file ────────────────────────────────────────────────────────
  let rawRows: Array<Record<string, string>>;
  try {
    rawRows = parseFile(fileBuffer, mimetype, originalname);
  } catch (e: any) {
    throw Object.assign(
      new Error(`File parse error: ${e.message}`),
      { statusCode: 400 }
    );
  }

  if (rawRows.length === 0)
    throw Object.assign(new Error('File is empty'), { statusCode: 400 });

  if (rawRows.length > MAX_PASSENGERS)
    throw Object.assign(
      new Error(`File contains ${rawRows.length} rows — max ${MAX_PASSENGERS} per trip`),
      { statusCode: 422 }
    );

  // ── 2. Fetch route stops (name → id) for this trip's route ──────────────
  const routeStops = await db
    .select({ id: stops.id, name: stops.name })
    .from(stops)
    .where(eq(stops.route_id, trip.route_id));

  const stopNameMap = new Map<string, string>(
    routeStops.map((s) => [s.name.toLowerCase().trim(), s.id])
  );

  // ── 3. Fetch existing passengers for this trip (duplicate phone guard) ───
  const existing = await db
    .select({ phone: tripPassengers.passenger_phone })
    .from(tripPassengers)
    .where(eq(tripPassengers.trip_id, tripId));
  const existingPhones = new Set(existing.map((e) => e.phone));

  // ── 4. Validate every row — collect all errors before rejecting ──────────
  const rowErrors: PassengerRowError[] = [];
  const seenPhonesInFile = new Set<string>();

  interface ReadyRow {
    passengerName: string;
    passengerPhone: string;
    stopId: string;
  }
  const readyRows: ReadyRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header
    const errors: string[] = [];

    // Zod schema check
    const parsed = PassengerRowSchema.safeParse({
      name: raw['name'] ?? raw['Name'] ?? '',
      phone: raw['phone'] ?? raw['Phone'] ?? '',
      stop_name: raw['stop_name'] ?? raw['Stop Name'] ?? raw['stop name'] ?? '',
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue: ZodIssue) => errors.push(issue.message));
    } else {
      const name = parsed.data.name!;
      const phone = parsed.data.phone!;
      const stop_name = parsed.data.stop_name!;
      const normalizedStopName = stop_name.toLowerCase().trim();

      // Stop name must exist on this route
      const stopId = stopNameMap.get(normalizedStopName);
      if (!stopId) {
        errors.push(
          `stop_name "${stop_name}" not found on route. Valid stops: ${Array.from(stopNameMap.keys()).join(', ')}`
        );
      }

      // Duplicate phone in this file
      if (seenPhonesInFile.has(phone)) {
        errors.push(`Duplicate phone ${phone} in this upload`);
      } else {
        seenPhonesInFile.add(phone);
      }

      // Duplicate phone already in trip
      if (existingPhones.has(phone)) {
        errors.push(`${phone} is already registered on this trip`);
      }

      if (errors.length === 0 && stopId) {
        readyRows.push({ passengerName: name, passengerPhone: phone, stopId });
      }
    }

    if (errors.length > 0) {
      rowErrors.push({ row: rowNum, data: raw, errors });
    }
  }

  // ── 5. If any row failed → reject entire file ────────────────────────────
  if (rowErrors.length > 0) {
    const err = Object.assign(
      new Error(`Upload rejected: ${rowErrors.length} row(s) failed validation`),
      { statusCode: 400, rowErrors }
    );
    throw err;
  }

  // ── 6. Single-transaction bulk insert ────────────────────────────────────
  await db.transaction(async (tx) => {
    const passengerInserts: Array<typeof tripPassengers.$inferInsert> = readyRows.map((r) => ({
      trip_id: tripId,
      passenger_name: r.passengerName,
      passenger_phone: r.passengerPhone,
      stop_id: r.stopId,
      alert_status: 'pending',
      created_at: new Date(),
    }));

    await tx.insert(tripPassengers).values(passengerInserts);
  });

  return {
    uploaded: readyRows.length,
    added: readyRows.length,
    added_count: readyRows.length,
  };
}
