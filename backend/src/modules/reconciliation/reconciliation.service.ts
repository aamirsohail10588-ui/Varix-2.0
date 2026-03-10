import prisma, { withTenantContext } from "../../infrastructure/prisma";

export class ReconciliationService {
    async autoMatchTransactions(tenantId: string) {
        return await withTenantContext(tenantId, async (tx) => {
            // 1. Fetch unmatched bank transactions for the tenant
            const unmatchedBankTransactions = await tx.bankTransaction.findMany({
                where: {
                    statement: {
                        tenantId: tenantId,
                    },
                    matches: {
                        none: {},
                    },
                },
            });

            // 2. Fetch all ledger entries for the same tenant
            const unmatchedLedgerEntries = await tx.ledgerEntry.findMany({
                where: {
                    tenant_id: tenantId,
                    reconciliationMatches: {
                        none: {},
                    },
                },
            });

            let matchCount = 0;
            const matchedLedgerIds = new Set<string>();

            // 3. Simple Auto-Matching Logic
            for (const bankTx of unmatchedBankTransactions) {
                const bankAmount = Number(bankTx.amount);

                const match = unmatchedLedgerEntries.find((ledger) => {
                    if (matchedLedgerIds.has(ledger.id)) return false;

                    const ledgerAmount =
                        Number(ledger.debit_amount) - Number(ledger.credit_amount);

                    const amountMatch = Math.abs(ledgerAmount - bankAmount) < 0.01;
                    const currencyMatch = ledger.currency === bankTx.currency;

                    // Date proximity (within 3 days)
                    const dateDiff =
                        Math.abs(
                            new Date(ledger.transaction_date).getTime() -
                            new Date(bankTx.transactionDate).getTime()
                        ) /
                        (1000 * 60 * 60 * 24);
                    const dateMatch = dateDiff <= 3;

                    return amountMatch && currencyMatch && dateMatch;
                });

                if (match) {
                    await tx.reconciliationMatch.create({
                        data: {
                            tenantId,
                            bankTransactionId: bankTx.id,
                            ledgerEntryId: match.id,
                            matchType: "AUTO",
                            confidence: 0.95,
                        },
                    });
                    matchedLedgerIds.add(match.id);
                    matchCount++;
                }
            }

            return { matchesFound: matchCount };
        });
    }

    async getUnmatchedTransactions(tenantId: string) {
        return await withTenantContext(tenantId, async (tx) => {
            return await tx.bankTransaction.findMany({
                where: {
                    statement: {
                        tenantId: tenantId,
                    },
                    matches: {
                        none: {},
                    },
                },
                orderBy: {
                    transactionDate: "desc",
                },
            });
        });
    }

    async getReconciliationSummary(tenantId: string) {
        return await withTenantContext(tenantId, async (tx) => {
            const totalBankTransactions = await tx.bankTransaction.count({
                where: {
                    statement: {
                        tenantId: tenantId,
                    },
                },
            });

            const matchedTransactions = await tx.reconciliationMatch.count({
                where: {
                    tenantId: tenantId,
                },
            });

            const unmatchedTransactions = totalBankTransactions - matchedTransactions;
            const matchRate =
                totalBankTransactions > 0
                    ? (matchedTransactions / totalBankTransactions) * 100
                    : 0;

            return {
                totalBankTransactions,
                matchedTransactions,
                unmatchedTransactions,
                matchRate: parseFloat(matchRate.toFixed(2)),
            };
        });
    }
}

export const reconciliationService = new ReconciliationService();
