import prisma, { withTenantContext } from "../../infrastructure/prisma";
import { ReconciliationRules } from "./reconciliation.rules";

export class ReconciliationService {
    /**
     * Create a new reconciliation session
     */
    async createSession(tenantId: string, period?: string, source?: string) {
        return await (prisma as any).reconciliationSession.create({
            data: {
                tenantId,
                period,
                source,
                status: "OPEN"
            }
        });
    }

    /**
     * Run advanced fuzzy matching logic for a session
     */
    async runFuzzyMatch(tenantId: string, sessionId: string) {
        const session = await (prisma as any).reconciliationSession.findUnique({
            where: { id: sessionId },
            include: { tenant: true }
        });

        if (!session || session.tenantId !== tenantId) {
            throw new Error("Session not found or access denied.");
        }

        // 1. Get unmatched bank transactions
        const unmatchedBankTxs = await prisma.bankTransaction.findMany({
            where: {
                statement: { tenantId },
                matches: { none: {} }
            }
        });

        // 2. Get recent ledger entries (e.g., last 30 days)
        const candidates = await prisma.ledgerEntry.findMany({
            where: {
                tenant_id: tenantId,
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        });

        const matches = [];

        for (const bt of unmatchedBankTxs) {
            let bestMatch: any = null;
            let highestScore = 0;

            for (const le of candidates) {
                const scoreResult = ReconciliationRules.calculateScore(bt, le);

                if (scoreResult.total > 0.6 && scoreResult.total > highestScore) {
                    highestScore = scoreResult.total;
                    bestMatch = {
                        bt,
                        le,
                        score: scoreResult
                    };
                }
            }

            if (bestMatch) {
                matches.push({
                    tenantId,
                    sessionId: session.id,
                    bankTransactionId: bestMatch.bt.id,
                    ledgerEntryId: bestMatch.le.id,
                    matchType: "AUTO_FUZZY",
                    confidence: bestMatch.score.total,
                    rules_meta: bestMatch.score.breakdown as any
                });
            }
        }

        // 3. Bulk insert matches
        if (matches.length > 0) {
            await prisma.reconciliationMatch.createMany({
                data: matches
            });
        }

        return { matchesFound: matches.length };
    }

    /**
     * Finalize and lock a reconciliation session
     */
    async finalizeSession(tenantId: string, sessionId: string) {
        return await (prisma as any).reconciliationSession.update({
            where: { id: sessionId, tenantId },
            data: { status: "COMMITTED" }
        });
    }

    async autoMatchTransactions(tenantId: string) {
        // Legacy support or fallback
        const session = await this.createSession(tenantId, "AUTO_FALLBACK", "LEGACY_TRIGGER");
        return await this.runFuzzyMatch(tenantId, session.id);
    }

    async getUnmatchedTransactions(tenantId: string) {
        return await prisma.bankTransaction.findMany({
            where: {
                statement: { tenantId },
                matches: { none: {} }
            },
            orderBy: { transactionDate: "desc" }
        });
    }

    async getReconciliationSummary(tenantId: string) {
        const totalBankTransactions = await prisma.bankTransaction.count({
            where: { statement: { tenantId } }
        });

        const matchedTransactions = await prisma.reconciliationMatch.count({
            where: { tenantId }
        });

        const unmatchedTransactions = totalBankTransactions - matchedTransactions;
        const matchRate = totalBankTransactions > 0 ? (matchedTransactions / totalBankTransactions) * 100 : 0;

        return {
            totalBankTransactions,
            matchedTransactions,
            unmatchedTransactions,
            matchRate: parseFloat(matchRate.toFixed(2))
        };
    }
}

export const reconciliationService = new ReconciliationService();
