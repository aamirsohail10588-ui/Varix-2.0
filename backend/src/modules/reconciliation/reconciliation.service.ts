import prisma, { withTenantContext } from "../../infrastructure/prisma";

export class ReconciliationService {
    async autoMatchTransactions(tenantId: string) {
        return await withTenantContext(tenantId, async (tx) => {
            const result = await tx.$executeRaw`
                INSERT INTO "ReconciliationMatch" (
                    id, "tenantId", "bankTransactionId", "ledgerEntryId", "matchType", confidence, "createdAt"
                )
                SELECT DISTINCT ON (bt.id)
                    gen_random_uuid(),
                    ${tenantId}::uuid,
                    bt.id,
                    le.id,
                    'AUTO',
                    0.95,
                    now()
                FROM "BankTransaction" bt
                JOIN "BankStatement" bs ON bs.id = bt."statementId"
                JOIN ledger_entries le ON 
                    le.tenant_id = bs."tenantId"
                    AND ABS((le.debit_amount - le.credit_amount) - bt.amount) < 0.01
                    AND le.currency = bt.currency
                    AND ABS(EXTRACT(EPOCH FROM (le.transaction_date - bt."transactionDate")) / 86400) <= 3
                LEFT JOIN "ReconciliationMatch" rm_bt ON rm_bt."bankTransactionId" = bt.id
                LEFT JOIN "ReconciliationMatch" rm_le ON rm_le."ledgerEntryId" = le.id
                WHERE 
                    bs."tenantId" = ${tenantId}::uuid
                    AND rm_bt.id IS NULL
                    AND rm_le.id IS NULL
                ORDER BY bt.id, ABS(EXTRACT(EPOCH FROM (le.transaction_date - bt."transactionDate"))) ASC
            `;

            return { matchesFound: Number(result) };
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
