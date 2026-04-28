"use strict";
/**
 * WalletService — Sprint 9 (refactored)
 *
 * Handles atomic prepaid trip-wallet operations for each agency.
 * Credits are in TRIPS (integer), not paise — each trip consumes 1 credit.
 *
 * Key operations:
 *   deductTripCredit     — called when a trip is completed (deducts 1 trip)
 *   topUpTrips           — admin adds trip credits to an agency wallet
 *   getOrCreateWallet    — idempotent wallet fetch / default creation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateWallet = getOrCreateWallet;
exports.deductTripCredit = deductTripCredit;
exports.topUpTrips = topUpTrips;
exports.updateWalletConfig = updateWalletConfig;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const socket_1 = require("../../lib/socket");
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
/** Fetch wallet for an agency. Creates a default row if missing. */
async function getOrCreateWallet(agencyId) {
    const [existing] = await db_1.db
        .select()
        .from(schema_1.agencyWallets)
        .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
        .limit(1);
    if (existing)
        return existing;
    // Create default wallet — 0 trips_remaining, threshold 10
    const [created] = await db_1.db
        .insert(schema_1.agencyWallets)
        .values({
        agency_id: agencyId,
        trips_remaining: 0,
        trips_used_this_month: 0,
        low_trip_threshold: 10,
    })
        .returning();
    return created;
}
// ─────────────────────────────────────────────────────────────────────────────
// Atomic trip deduction — safe for concurrent completions.
// Uses PostgreSQL UPDATE + RETURNING.
// If trips_remaining < 1 the call is a no-op (returns { success: false }).
// ─────────────────────────────────────────────────────────────────────────────
async function deductTripCredit(agencyId, tripId) {
    const wallet = await getOrCreateWallet(agencyId);
    if (wallet.trips_remaining < 1) {
        // No trips remaining — log but do not block trip completion
        await db_1.db.insert(schema_1.walletTransactions).values({
            agency_id: agencyId,
            trips_amount: 0,
            trips_remaining_after: wallet.trips_remaining,
            type: 'trip_deduction',
            description: `Insufficient trip credits for trip ${tripId}`,
            reference_id: tripId,
        });
        return { success: false, tripsRemainingAfter: wallet.trips_remaining, lowTrips: true };
    }
    // Atomic deduction via UPDATE + RETURNING
    const [updated] = await db_1.db
        .update(schema_1.agencyWallets)
        .set({
        trips_remaining: (0, drizzle_orm_1.sql) `trips_remaining - 1`,
        trips_used_this_month: (0, drizzle_orm_1.sql) `trips_used_this_month + 1`,
        updated_at: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
        .returning({
        trips_remaining: schema_1.agencyWallets.trips_remaining,
        low_trip_threshold: schema_1.agencyWallets.low_trip_threshold,
    });
    const newRemaining = updated.trips_remaining;
    // Immutable ledger entry
    await db_1.db.insert(schema_1.walletTransactions).values({
        agency_id: agencyId,
        trips_amount: -1,
        trips_remaining_after: newRemaining,
        type: 'trip_deduction',
        description: `Trip credit deducted for trip ${tripId}`,
        reference_id: tripId,
    });
    const lowTrips = newRemaining <= updated.low_trip_threshold;
    // Emit low-balance Socket.IO event so owner dashboard can show warning
    if (lowTrips) {
        try {
            await (0, socket_1.emitSocketEvent)(`agency:${agencyId}`, 'low_trips_alert', {
                agencyId,
                tripsRemaining: newRemaining,
                threshold: updated.low_trip_threshold,
            });
        }
        catch (_) { /* Socket.IO may not be running in test mode */ }
    }
    return { success: true, tripsRemainingAfter: newRemaining, lowTrips };
}
// ─────────────────────────────────────────────────────────────────────────────
// Top-up — admin credits trip credits to an agency wallet
// ─────────────────────────────────────────────────────────────────────────────
async function topUpTrips(agencyId, tripsToAdd, description, referenceId) {
    if (tripsToAdd <= 0)
        throw Object.assign(new Error('Top-up amount must be a positive integer'), { statusCode: 400 });
    await getOrCreateWallet(agencyId);
    const [updated] = await db_1.db
        .update(schema_1.agencyWallets)
        .set({
        trips_remaining: (0, drizzle_orm_1.sql) `trips_remaining + ${tripsToAdd}`,
        updated_at: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
        .returning({ trips_remaining: schema_1.agencyWallets.trips_remaining });
    await db_1.db.insert(schema_1.walletTransactions).values({
        agency_id: agencyId,
        trips_amount: tripsToAdd,
        trips_remaining_after: updated.trips_remaining,
        type: 'trip_topup',
        description: description ?? `Admin top-up of ${tripsToAdd} trip(s)`,
        reference_id: referenceId,
    });
    return { tripsRemainingAfter: updated.trips_remaining };
}
// ─────────────────────────────────────────────────────────────────────────────
// Update low-trip threshold (admin only)
// ─────────────────────────────────────────────────────────────────────────────
async function updateWalletConfig(agencyId, updates) {
    await getOrCreateWallet(agencyId);
    const [updated] = await db_1.db
        .update(schema_1.agencyWallets)
        .set({ ...updates, updated_at: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
        .returning();
    return updated;
}
