/**
 * MODULE: Consolidation Service
 * PATH: src/services/consolidation.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 *
 * Schema facts (from prisma/schema.prisma):
 *
 * IntercompanyTransaction fields:
 *   id, tenantId, fromEntityId, toEntityId, amount, currency,
 *   transactionDate, description
 *   — NO period field
 *   — NO isEliminated field
 *
 * EliminationJournal fields:
 *   id, tenantId, consolidationId, description, amount, createdAt
 *   — NO transactionId field
 *   — NO currency field
 *   — NO eliminationType field
 *
 * Entity fields:
 *   id, tenantId, name, country, currency, createdAt, updatedAt
 *   — NO parentRelations / childrenRelations directly on Entity
 *   — Relations are: childOf (EntityHierarchy[]) and parentOf (EntityHierarchy[])
 */

import prisma from "../lib/prisma";
import { Decimal } from "decimal.js";

export class ConsolidationService {

    /**
     * Run intercompany elimination for a specific period.
     * Schema has no period or isEliminated on IntercompanyTransaction,
     * so we filter by transactionDate range and track eliminations
     * via EliminationJournal existence check.
     */
    async runElimination(
        tenantId: string,
        period: string,
        consolidationId: string
    ): Promise<{ eliminatedCount: number }> {
        // Derive date range from period string (e.g. "2025-Q1", "2025-03")
        const { startDate, endDate } = parsePeriodToDateRange(period);

        // Find intercompany transactions in period
        const transactions = await prisma.intercompanyTransaction.findMany({
            where: {
                tenantId,
                transactionDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        if (transactions.length === 0) return { eliminatedCount: 0 };

        // Find already-eliminated transaction IDs via existing journals
        const existingJournals = await prisma.eliminationJournal.findMany({
            where: { tenantId, consolidationId },
            select: { description: true },
        });

        // We encode transactionId in description for lineage since schema has no transactionId field
        const alreadyEliminated = new Set(
            existingJournals
                .map((j) => extractTransactionIdFromDescription(j.description))
                .filter((id): id is string => !!id)
        );

        const eliminations = [];

        for (const tx of transactions) {
            if (alreadyEliminated.has(tx.id)) continue;

            // EliminationJournal schema: tenantId, consolidationId, description, amount
            // No transactionId, currency, or eliminationType fields in schema
            const eliminationEntry = await prisma.eliminationJournal.create({
                data: {
                    tenantId,
                    consolidationId,
                    amount: tx.amount,
                    description: `ELIM:${tx.id} | Auto-eliminated intercompany transaction ${tx.id} | ${tx.currency}`,
                },
            });

            eliminations.push(eliminationEntry);
        }

        return { eliminatedCount: eliminations.length };
    }

    /**
     * FX Translation — converts amount from one currency to another
     */
    async translateCurrency(
        amount: number,
        fromCurrency: string,
        toCurrency: string,
        rate: number
    ): Promise<number> {
        const decAmount = new Decimal(amount);
        const decRate = new Decimal(rate);
        return decAmount.mul(decRate).toNumber();
    }

    /**
     * Build Entity Hierarchy Tree
     * Schema relations on Entity: childOf (EntityHierarchy[]), parentOf (EntityHierarchy[])
     * Not: parentRelations / childrenRelations
     */
    async getHierarchy(tenantId: string) {
        const entities = await prisma.entity.findMany({
            where: { tenantId },
            include: {
                childOf: true,   // EntityHierarchy[] where this entity is the child
                parentOf: true,  // EntityHierarchy[] where this entity is the parent
            },
        });

        return entities;
    }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function parsePeriodToDateRange(period: string): {
    startDate: Date;
    endDate: Date;
} {
    // Format: "2025-Q1" → Jan–Mar 2025
    const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        const year = parseInt(quarterMatch[1]);
        const quarter = parseInt(quarterMatch[2]);
        const startMonth = (quarter - 1) * 3;
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, startMonth + 3, 0); // last day of quarter
        return { startDate, endDate };
    }

    // Format: "2025-03" → March 2025
    const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
        const year = parseInt(monthMatch[1]);
        const month = parseInt(monthMatch[2]) - 1;
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        return { startDate, endDate };
    }

    // Format: "2025" → full year
    const yearMatch = period.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        return {
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31),
        };
    }

    throw new Error(
        `Invalid period format: "${period}". Expected formats: "2025-Q1", "2025-03", or "2025".`
    );
}

function extractTransactionIdFromDescription(
    description: string
): string | null {
    const match = description.match(/^ELIM:([^\s|]+)/);
    return match ? match[1] : null;
}

export const consolidationService = new ConsolidationService();