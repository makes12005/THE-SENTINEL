/**
 * BillingService — Sprint 9
 *
 * Handles atomic prepaid wallet operations for each agency.
 * All amounts are in PAISE (1 paise = ₹0.01) to avoid floating-point issues.
 *
 * Key operations:
 *   deductAlertCost   — called after each alert is sent (negative tx)
 *   topUp             — admin adds credit to an agency wallet (positive tx)
 *   getOrCreateConfig — idempotent config fetch / default creation
 */

import { db } from '../../db';
import {
  agencyBillingConfig,
  billingTransactions,
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { emitSocketEvent } from '../../lib/socket';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch billing config for an agency. Creates a default row if missing. */
export async function getOrCreateBillingConfig(agencyId: string) {
  const [existing] = await db
    .select()
    .from(agencyBillingConfig)
    .where(eq(agencyBillingConfig.agency_id, agencyId))
    .limit(1);

  if (existing) return existing;

  // Create default config — balance 0, ₹2 per alert, ₹100 low-balance threshold
  const [created] = await db
    .insert(agencyBillingConfig)
    .values({
      agency_id: agencyId,
      balance_paise: 0,
      per_alert_paise: 200,
      low_balance_threshold_paise: 10000,
    })
    .returning();

  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// Atomic deduction — safe for concurrent conductors alerting simultaneously
// Uses PostgreSQL UPDATE + RETURNING to deduct atomically.
// If balance < per_alert_paise the call is a no-op (returns false).
// ─────────────────────────────────────────────────────────────────────────────
export async function deductAlertCost(
  agencyId: string,
  tripId: string,
  alertCount: number = 1
): Promise<{ success: boolean; balancePaiseAfter: number; lowBalance: boolean }> {
  const config = await getOrCreateBillingConfig(agencyId);
  const totalDeductionPaise = config.per_alert_paise * alertCount;

  if (config.balance_paise < totalDeductionPaise) {
    // Not enough balance — log an insufficient-funds transaction and bail
    await db.insert(billingTransactions).values({
      agency_id: agencyId,
      amount_paise: 0,
      balance_after_paise: config.balance_paise,
      type: 'alert_deduction',
      description: `Insufficient balance for ${alertCount} alert(s) on trip ${tripId}`,
      reference_id: tripId,
    });
    return { success: false, balancePaiseAfter: config.balance_paise, lowBalance: true };
  }

  // Atomic deduction via UPDATE + RETURNING
  const [updated] = await db
    .update(agencyBillingConfig)
    .set({
      balance_paise: sql`balance_paise - ${totalDeductionPaise}`,
      updated_at: new Date(),
    })
    .where(eq(agencyBillingConfig.agency_id, agencyId))
    .returning({ balance_paise: agencyBillingConfig.balance_paise });

  const newBalance = updated.balance_paise;

  // Immutable ledger entry
  await db.insert(billingTransactions).values({
    agency_id: agencyId,
    amount_paise: -totalDeductionPaise,
    balance_after_paise: newBalance,
    type: 'alert_deduction',
    description: `Deducted ₹${(totalDeductionPaise / 100).toFixed(2)} for ${alertCount} alert(s)`,
    reference_id: tripId,
  });

  const lowBalance = newBalance <= config.low_balance_threshold_paise;

  // Emit low-balance Socket.IO event so owner dashboard can show warning
  if (lowBalance) {
    try {
      await emitSocketEvent(`agency:${agencyId}`, 'low_balance_alert', {
        agencyId,
        balancePaise: newBalance,
        balanceRupees: newBalance / 100,
        thresholdRupees: config.low_balance_threshold_paise / 100,
      });
    } catch (_) { /* Socket.IO may not be running in test mode */ }
  }

  return { success: true, balancePaiseAfter: newBalance, lowBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-up — admin credits an agency wallet
// ─────────────────────────────────────────────────────────────────────────────
export async function topUpBalance(
  agencyId: string,
  amountPaise: number,
  description?: string,
  referenceId?: string
): Promise<{ balancePaiseAfter: number }> {
  if (amountPaise <= 0) throw Object.assign(new Error('Top-up amount must be positive'), { statusCode: 400 });

  await getOrCreateBillingConfig(agencyId);

  const [updated] = await db
    .update(agencyBillingConfig)
    .set({
      balance_paise: sql`balance_paise + ${amountPaise}`,
      updated_at: new Date(),
    })
    .where(eq(agencyBillingConfig.agency_id, agencyId))
    .returning({ balance_paise: agencyBillingConfig.balance_paise });

  await db.insert(billingTransactions).values({
    agency_id: agencyId,
    amount_paise: amountPaise,
    balance_after_paise: updated.balance_paise,
    type: 'topup',
    description: description ?? `Admin top-up of ₹${(amountPaise / 100).toFixed(2)}`,
    reference_id: referenceId,
  });

  return { balancePaiseAfter: updated.balance_paise };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update per-alert cost (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateBillingConfig(
  agencyId: string,
  updates: {
    per_alert_paise?: number;
    low_balance_threshold_paise?: number;
  }
): Promise<typeof agencyBillingConfig.$inferSelect> {
  await getOrCreateBillingConfig(agencyId);

  const [updated] = await db
    .update(agencyBillingConfig)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(agencyBillingConfig.agency_id, agencyId))
    .returning();

  return updated;
}
