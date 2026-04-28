"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransactions = exports.walletTransactionTypeEnum = exports.agencyWallets = exports.alertLogs = exports.conductorLocations = exports.tripPassengers = exports.trips = exports.buses = exports.stops = exports.routes = exports.auditLogs = exports.refreshTokens = exports.users = exports.agencies = exports.agencyInvites = exports.alertLogStatusEnum = exports.alertChannelEnum = exports.alertStatusEnum = exports.tripStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// ─────────────────────────────────────────────────────────────────────────────
// PostGIS geometry(Point, 4326) — WGS84 coordinates stored as EWKT string
// ─────────────────────────────────────────────────────────────────────────────
const geometry = (0, pg_core_1.customType)({
    dataType() {
        return 'geometry(Point, 4326)';
    },
});
// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
exports.userRoleEnum = (0, pg_core_1.pgEnum)('role', ['admin', 'owner', 'operator', 'driver', 'conductor', 'passenger']);
exports.tripStatusEnum = (0, pg_core_1.pgEnum)('trip_status', ['scheduled', 'active', 'completed']);
exports.alertStatusEnum = (0, pg_core_1.pgEnum)('alert_status', ['pending', 'sent', 'failed']);
exports.alertChannelEnum = (0, pg_core_1.pgEnum)('alert_channel', ['call', 'sms', 'whatsapp', 'manual']);
exports.alertLogStatusEnum = (0, pg_core_1.pgEnum)('alert_log_status', ['success', 'failed']);
// ─────────────────────────────────────────────────────────────────────────────
// Auth tables (unchanged from sprint 1)
// ─────────────────────────────────────────────────────────────────────────────
exports.agencyInvites = (0, pg_core_1.pgTable)('agency_invites', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    invite_token: (0, pg_core_1.uuid)('invite_token').defaultRandom().notNull().unique(),
    invited_by: (0, pg_core_1.uuid)('invited_by').notNull(), // admin user id
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(), // 'pending', 'accepted', 'expired'
    expires_at: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    accepted_at: (0, pg_core_1.timestamp)('accepted_at', { withTimezone: true })
});
exports.agencies = (0, pg_core_1.pgTable)('agencies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    state: (0, pg_core_1.varchar)('state', { length: 255 }).notNull(),
    invite_code: (0, pg_core_1.varchar)('invite_code', { length: 20 }).unique(),
    onboarded_via_invite: (0, pg_core_1.boolean)('onboarded_via_invite').default(false).notNull(),
    invite_id: (0, pg_core_1.uuid)('invite_id').references(() => exports.agencyInvites.id),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
});
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    agency_id: (0, pg_core_1.uuid)('agency_id').references(() => exports.agencies.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }), // nullable — email-only users have no phone
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    password_hash: (0, pg_core_1.text)('password_hash').notNull(),
    role: (0, exports.userRoleEnum)('role').notNull(),
    is_active: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    added_by: (0, pg_core_1.uuid)('added_by'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    // Global uniqueness for admin/owner/operator who have email/phone globally unique
    // Conductors & drivers are scoped per-agency — enforced in application layer with
    // a compound check. DB-level partial unique index is in the migration SQL.
    phoneGlobalIdx: (0, pg_core_1.index)('users_phone_idx').on(table.phone),
}));
exports.refreshTokens = (0, pg_core_1.pgTable)('refresh_tokens', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    token_hash: (0, pg_core_1.text)('token_hash').notNull(),
    expires_at: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
});
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    action: (0, pg_core_1.varchar)('action', { length: 255 }).notNull(),
    entity_type: (0, pg_core_1.varchar)('entity_type', { length: 255 }).notNull(),
    entity_id: (0, pg_core_1.varchar)('entity_id', { length: 255 }),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    ip_address: (0, pg_core_1.varchar)('ip_address', { length: 64 }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
});
// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
exports.routes = (0, pg_core_1.pgTable)('routes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    agency_id: (0, pg_core_1.uuid)('agency_id').references(() => exports.agencies.id).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    from_city: (0, pg_core_1.varchar)('from_city', { length: 255 }).notNull(),
    to_city: (0, pg_core_1.varchar)('to_city', { length: 255 }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    agencyIdx: (0, pg_core_1.index)('routes_agency_idx').on(table.agency_id),
    agencyNameUnique: (0, pg_core_1.unique)('routes_agency_name_unique').on(table.agency_id, table.name),
}));
// ─────────────────────────────────────────────────────────────────────────────
// Stops
// NOTE: GIST index on coordinates is added via raw SQL in the migration file
//       because drizzle-orm v0.30 index builder does not support .using('gist')
// ─────────────────────────────────────────────────────────────────────────────
exports.stops = (0, pg_core_1.pgTable)('stops', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    route_id: (0, pg_core_1.uuid)('route_id').references(() => exports.routes.id).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    sequence_number: (0, pg_core_1.integer)('sequence_number').notNull(),
    coordinates: geometry('coordinates').notNull(),
    trigger_radius_km: (0, pg_core_1.decimal)('trigger_radius_km', { precision: 5, scale: 2 }).default('10').notNull(),
});
// ─────────────────────────────────────────────────────────────────────────────
// Buses — shared agency resource
// UNIQUE(agency_id, number_plate) — enforced via DB unique index in migration
// ─────────────────────────────────────────────────────────────────────────────
exports.buses = (0, pg_core_1.pgTable)('buses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    agency_id: (0, pg_core_1.uuid)('agency_id').references(() => exports.agencies.id).notNull(),
    number_plate: (0, pg_core_1.varchar)('number_plate', { length: 20 }).notNull(),
    model: (0, pg_core_1.varchar)('model', { length: 255 }),
    capacity: (0, pg_core_1.integer)('capacity'),
    is_active: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    added_by: (0, pg_core_1.uuid)('added_by').references(() => exports.users.id).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    agencyPlateUnique: (0, pg_core_1.unique)('buses_agency_plate_unique').on(table.agency_id, table.number_plate),
    agencyIdx: (0, pg_core_1.index)('buses_agency_idx').on(table.agency_id),
}));
// ─────────────────────────────────────────────────────────────────────────────
// Trips
// ─────────────────────────────────────────────────────────────────────────────
exports.trips = (0, pg_core_1.pgTable)('trips', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    route_id: (0, pg_core_1.uuid)('route_id').references(() => exports.routes.id).notNull(),
    owned_by_operator_id: (0, pg_core_1.uuid)('operator_id').references(() => exports.users.id).notNull(),
    assigned_operator_id: (0, pg_core_1.uuid)('assigned_to_operator_id').references(() => exports.users.id),
    conductor_id: (0, pg_core_1.uuid)('conductor_id').references(() => exports.users.id).notNull(),
    driver_id: (0, pg_core_1.uuid)('driver_id').references(() => exports.users.id),
    bus_id: (0, pg_core_1.uuid)('bus_id').references(() => exports.buses.id), // optional assigned bus
    status: (0, exports.tripStatusEnum)('status').default('scheduled').notNull(),
    scheduled_date: (0, pg_core_1.date)('scheduled_date').notNull(),
    started_at: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    completed_at: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
});
// ─────────────────────────────────────────────────────────────────────────────
// Trip Passengers — B-tree index on (trip_id, alert_status)
// ─────────────────────────────────────────────────────────────────────────────
exports.tripPassengers = (0, pg_core_1.pgTable)('trip_passengers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    trip_id: (0, pg_core_1.uuid)('trip_id').references(() => exports.trips.id).notNull(),
    passenger_name: (0, pg_core_1.varchar)('passenger_name', { length: 255 }).notNull(),
    passenger_phone: (0, pg_core_1.varchar)('passenger_phone', { length: 20 }).notNull(),
    stop_id: (0, pg_core_1.uuid)('stop_id').references(() => exports.stops.id).notNull(),
    alert_status: (0, exports.alertStatusEnum)('alert_status').default('pending').notNull(),
    alert_channel: (0, exports.alertChannelEnum)('alert_channel'), // set on successful delivery
    alert_sent_at: (0, pg_core_1.timestamp)('alert_sent_at', { withTimezone: true }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
    tripPassengersPendingIdx: (0, pg_core_1.index)('trip_passengers_trip_status_idx').on(table.trip_id, table.alert_status),
}));
// ─────────────────────────────────────────────────────────────────────────────
// Conductor Locations
// B-tree index on (trip_id, recorded_at) — Drizzle managed
// GIST index on coordinates — added via raw SQL in migration (drizzle v0.30 limitation)
// ─────────────────────────────────────────────────────────────────────────────
exports.conductorLocations = (0, pg_core_1.pgTable)('conductor_locations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    trip_id: (0, pg_core_1.uuid)('trip_id').references(() => exports.trips.id).notNull(),
    conductor_id: (0, pg_core_1.uuid)('conductor_id').references(() => exports.users.id).notNull(),
    coordinates: geometry('coordinates').notNull(),
    recorded_at: (0, pg_core_1.timestamp)('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    battery_level: (0, pg_core_1.decimal)('battery_level', { precision: 5, scale: 2 }),
    accuracy_meters: (0, pg_core_1.decimal)('accuracy_meters', { precision: 8, scale: 2 })
}, (table) => ({
    conductorLocTimeIdx: (0, pg_core_1.index)('conductor_loc_trip_time_idx').on(table.trip_id, table.recorded_at),
}));
// ─────────────────────────────────────────────────────────────────────────────
// Alert Logs — one row per delivery attempt per channel
// ─────────────────────────────────────────────────────────────────────────────
exports.alertLogs = (0, pg_core_1.pgTable)('alert_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    trip_passenger_id: (0, pg_core_1.uuid)('trip_passenger_id').references(() => exports.tripPassengers.id).notNull(),
    channel: (0, exports.alertChannelEnum)('channel').notNull(),
    status: (0, exports.alertLogStatusEnum)('status').notNull(),
    attempted_at: (0, pg_core_1.timestamp)('attempted_at', { withTimezone: true }).defaultNow().notNull(),
    response_code: (0, pg_core_1.varchar)('response_code', { length: 64 }),
    error_message: (0, pg_core_1.text)('error_message'),
}, (table) => ({
    alertLogPassengerIdx: (0, pg_core_1.index)('alert_logs_passenger_idx').on(table.trip_passenger_id),
}));
// ─────────────────────────────────────────────────────────────────────────────
// Trip Wallet — Agency prepaid trip balance
// ─────────────────────────────────────────────────────────────────────────────
exports.agencyWallets = (0, pg_core_1.pgTable)('agency_wallets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    agency_id: (0, pg_core_1.uuid)('agency_id').references(() => exports.agencies.id).notNull().unique(),
    trips_remaining: (0, pg_core_1.integer)('trips_remaining').notNull().default(0),
    trips_used_this_month: (0, pg_core_1.integer)('trips_used_this_month').notNull().default(0),
    low_trip_threshold: (0, pg_core_1.integer)('low_trip_threshold').notNull().default(10),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.walletTransactionTypeEnum = (0, pg_core_1.pgEnum)('wallet_tx_type', ['trip_topup', 'trip_deduction']);
exports.walletTransactions = (0, pg_core_1.pgTable)('wallet_transactions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    agency_id: (0, pg_core_1.uuid)('agency_id').references(() => exports.agencies.id).notNull(),
    trips_amount: (0, pg_core_1.integer)('trips_amount').notNull(), // +credit / -debit
    trips_remaining_after: (0, pg_core_1.integer)('trips_remaining_after').notNull(),
    type: (0, exports.walletTransactionTypeEnum)('type').notNull(),
    description: (0, pg_core_1.text)('description'),
    reference_id: (0, pg_core_1.varchar)('reference_id', { length: 255 }), // tripId or payment ref
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    walletTxAgencyIdx: (0, pg_core_1.index)('wallet_tx_agency_idx').on(table.agency_id, table.created_at),
}));
