import {
  pgTable, uuid, varchar, text, boolean, timestamp, jsonb,
  pgEnum, integer, decimal, bigint, index, customType, date
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// PostGIS geometry(Point, 4326) — WGS84 coordinates stored as EWKT string
// ─────────────────────────────────────────────────────────────────────────────
const geometry = customType<{ data: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('role', ['admin', 'owner', 'operator', 'driver', 'conductor', 'passenger']);
export const tripStatusEnum = pgEnum('trip_status', ['scheduled', 'active', 'completed']);
export const alertStatusEnum = pgEnum('alert_status', ['pending', 'sent', 'failed']);
export const alertChannelEnum = pgEnum('alert_channel', ['call', 'sms', 'whatsapp', 'manual']);
export const alertLogStatusEnum = pgEnum('alert_log_status', ['success', 'failed']);

// ─────────────────────────────────────────────────────────────────────────────
// Auth tables (unchanged from sprint 1)
// ─────────────────────────────────────────────────────────────────────────────
export const agencies = pgTable('agencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  state: varchar('state', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').references(() => agencies.id),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  token_hash: text('token_hash').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  entity_type: varchar('entity_type', { length: 255 }).notNull(),
  entity_id: varchar('entity_id', { length: 255 }),
  metadata: jsonb('metadata'),
  ip_address: varchar('ip_address', { length: 64 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
export const routes = pgTable('routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').references(() => agencies.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  from_city: varchar('from_city', { length: 255 }).notNull(),
  to_city: varchar('to_city', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ─────────────────────────────────────────────────────────────────────────────
// Stops
// NOTE: GIST index on coordinates is added via raw SQL in the migration file
//       because drizzle-orm v0.30 index builder does not support .using('gist')
// ─────────────────────────────────────────────────────────────────────────────
export const stops = pgTable('stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  route_id: uuid('route_id').references(() => routes.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sequence_number: integer('sequence_number').notNull(),
  coordinates: geometry('coordinates').notNull(),
  trigger_radius_km: decimal('trigger_radius_km', { precision: 5, scale: 2 }).default('10').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Trips
// ─────────────────────────────────────────────────────────────────────────────
export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  route_id: uuid('route_id').references(() => routes.id).notNull(),
  operator_id: uuid('operator_id').references(() => users.id).notNull(),
  conductor_id: uuid('conductor_id').references(() => users.id).notNull(),
  driver_id: uuid('driver_id').references(() => users.id),
  status: tripStatusEnum('status').default('scheduled').notNull(),
  scheduled_date: date('scheduled_date').notNull(),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ─────────────────────────────────────────────────────────────────────────────
// Trip Passengers — B-tree index on (trip_id, alert_status)
// ─────────────────────────────────────────────────────────────────────────────
export const tripPassengers = pgTable('trip_passengers', {
  id: uuid('id').defaultRandom().primaryKey(),
  trip_id: uuid('trip_id').references(() => trips.id).notNull(),
  passenger_name: varchar('passenger_name', { length: 255 }).notNull(),
  passenger_phone: varchar('passenger_phone', { length: 20 }).notNull(),
  stop_id: uuid('stop_id').references(() => stops.id).notNull(),
  alert_status: alertStatusEnum('alert_status').default('pending').notNull(),
  alert_channel: alertChannelEnum('alert_channel'),          // set on successful delivery
  alert_sent_at: timestamp('alert_sent_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  tripPassengersPendingIdx: index('trip_passengers_trip_status_idx').on(table.trip_id, table.alert_status),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Conductor Locations
// B-tree index on (trip_id, recorded_at) — Drizzle managed
// GIST index on coordinates — added via raw SQL in migration (drizzle v0.30 limitation)
// ─────────────────────────────────────────────────────────────────────────────
export const conductorLocations = pgTable('conductor_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  trip_id: uuid('trip_id').references(() => trips.id).notNull(),
  conductor_id: uuid('conductor_id').references(() => users.id).notNull(),
  coordinates: geometry('coordinates').notNull(),
  recorded_at: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  battery_level: decimal('battery_level', { precision: 5, scale: 2 }),
  accuracy_meters: decimal('accuracy_meters', { precision: 8, scale: 2 })
}, (table) => ({
  conductorLocTimeIdx: index('conductor_loc_trip_time_idx').on(table.trip_id, table.recorded_at),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Alert Logs — one row per delivery attempt per channel
// ─────────────────────────────────────────────────────────────────────────────
export const alertLogs = pgTable('alert_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  trip_passenger_id: uuid('trip_passenger_id').references(() => tripPassengers.id).notNull(),
  channel: alertChannelEnum('channel').notNull(),
  status: alertLogStatusEnum('status').notNull(),
  attempted_at: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  response_code: varchar('response_code', { length: 64 }),
  error_message: text('error_message'),
}, (table) => ({
  alertLogPassengerIdx: index('alert_logs_passenger_idx').on(table.trip_passenger_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Billing — Admin-controlled per-agency prepaid wallet
// Balance is stored in paise (1 paise = ₹0.01) to avoid float money issues
// ─────────────────────────────────────────────────────────────────────────────
export const agencyBillingConfig = pgTable('agency_billing_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').references(() => agencies.id).notNull().unique(),
  balance_paise: bigint('balance_paise', { mode: 'number' }).notNull().default(0),
  per_alert_paise: integer('per_alert_paise').notNull().default(200),       // ₹2.00 per alert
  low_balance_threshold_paise: bigint('low_balance_threshold_paise', { mode: 'number' }).notNull().default(10000), // ₹100
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const billingTransactionTypeEnum = pgEnum('billing_tx_type', ['topup', 'alert_deduction']);

export const billingTransactions = pgTable('billing_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agency_id: uuid('agency_id').references(() => agencies.id).notNull(),
  amount_paise: bigint('amount_paise', { mode: 'number' }).notNull(),           // +credit / -debit
  balance_after_paise: bigint('balance_after_paise', { mode: 'number' }).notNull(),
  type: billingTransactionTypeEnum('type').notNull(),
  description: text('description'),
  reference_id: varchar('reference_id', { length: 255 }),                       // tripId or payment ref
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  billingTxAgencyIdx: index('billing_tx_agency_idx').on(table.agency_id, table.created_at),
}));

