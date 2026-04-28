"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPassengers = uploadPassengers;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const XLSX = __importStar(require("xlsx"));
const sync_1 = require("csv-parse/sync");
const shared_types_1 = require("../../lib/shared-types");
const MAX_PASSENGERS = 100;
const E164_RE = /^\+91\d{10}$/;
// ── Parse raw buffer → rows array ────────────────────────────────────────────
function parseFile(buffer, mimetype, originalname) {
    const ext = originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || mimetype === 'text/csv') {
        const records = (0, sync_1.parse)(buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        return records;
    }
    // xlsx / xls
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {
        defval: '',
        raw: false,
    });
    return rows;
}
async function uploadPassengers(tripId, operatorAgencyId, fileBuffer, mimetype, originalname) {
    // ── 0. Verify trip belongs to operator's agency ──────────────────────────
    const [trip] = await db_1.db
        .select({ id: schema_1.trips.id, route_id: schema_1.trips.route_id, status: schema_1.trips.status })
        .from(schema_1.trips)
        .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
        .limit(1);
    if (!trip)
        throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    // Verify operator's agency owns the route (via join)
    const routeRows = Array.from(await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT agency_id FROM routes WHERE id = ${trip.route_id} LIMIT 1`));
    if (!routeRows[0] || routeRows[0].agency_id !== operatorAgencyId) {
        throw Object.assign(new Error('Trip does not belong to your agency'), { statusCode: 403 });
    }
    // ── 1. Parse file ────────────────────────────────────────────────────────
    let rawRows;
    try {
        rawRows = parseFile(fileBuffer, mimetype, originalname);
    }
    catch (e) {
        throw Object.assign(new Error(`File parse error: ${e.message}`), { statusCode: 400 });
    }
    if (rawRows.length === 0)
        throw Object.assign(new Error('File is empty'), { statusCode: 400 });
    if (rawRows.length > MAX_PASSENGERS)
        throw Object.assign(new Error(`File contains ${rawRows.length} rows — max ${MAX_PASSENGERS} per trip`), { statusCode: 422 });
    // ── 2. Fetch route stops (name → id) for this trip's route ──────────────
    const routeStops = await db_1.db
        .select({ id: schema_1.stops.id, name: schema_1.stops.name })
        .from(schema_1.stops)
        .where((0, drizzle_orm_1.eq)(schema_1.stops.route_id, trip.route_id));
    const stopNameMap = new Map(routeStops.map((s) => [s.name.toLowerCase().trim(), s.id]));
    // ── 3. Fetch existing passengers for this trip (duplicate phone guard) ───
    const existing = await db_1.db
        .select({ phone: schema_1.tripPassengers.passenger_phone })
        .from(schema_1.tripPassengers)
        .where((0, drizzle_orm_1.eq)(schema_1.tripPassengers.trip_id, tripId));
    const existingPhones = new Set(existing.map((e) => e.phone));
    // ── 4. Validate every row — collect all errors before rejecting ──────────
    const rowErrors = [];
    const seenPhonesInFile = new Set();
    const readyRows = [];
    for (let i = 0; i < rawRows.length; i++) {
        const raw = rawRows[i];
        const rowNum = i + 2; // 1-indexed, +1 for header
        const errors = [];
        // Zod schema check
        const parsed = shared_types_1.PassengerRowSchema.safeParse({
            name: raw['name'] ?? raw['Name'] ?? '',
            phone: raw['phone'] ?? raw['Phone'] ?? '',
            stop_name: raw['stop_name'] ?? raw['Stop Name'] ?? raw['stop name'] ?? '',
        });
        if (!parsed.success) {
            parsed.error.issues.forEach((issue) => errors.push(issue.message));
        }
        else {
            const name = parsed.data.name;
            const phone = parsed.data.phone;
            const stop_name = parsed.data.stop_name;
            const normalizedStopName = stop_name.toLowerCase().trim();
            // Stop name must exist on this route
            const stopId = stopNameMap.get(normalizedStopName);
            if (!stopId) {
                errors.push(`stop_name "${stop_name}" not found on route. Valid stops: ${Array.from(stopNameMap.keys()).join(', ')}`);
            }
            // Duplicate phone in this file
            if (seenPhonesInFile.has(phone)) {
                errors.push(`Duplicate phone ${phone} in this upload`);
            }
            else {
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
        const err = Object.assign(new Error(`Upload rejected: ${rowErrors.length} row(s) failed validation`), { statusCode: 400, rowErrors });
        throw err;
    }
    // ── 6. Single-transaction bulk insert ────────────────────────────────────
    await db_1.db.transaction(async (tx) => {
        const passengerInserts = readyRows.map((r) => ({
            trip_id: tripId,
            passenger_name: r.passengerName,
            passenger_phone: r.passengerPhone,
            stop_id: r.stopId,
            alert_status: 'pending',
            created_at: new Date(),
        }));
        await tx.insert(schema_1.tripPassengers).values(passengerInserts);
    });
    return {
        uploaded: readyRows.length,
    };
}
