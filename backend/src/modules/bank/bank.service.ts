import prisma, { withTenantContext } from "../../infrastructure/prisma";

export class BankService {
    async uploadStatement(tenantId: string, bankAccountId: string, statementDate: Date, transactions: any[]) {
        return await withTenantContext(tenantId, async (tx) => {
            const statement = await tx.bankStatement.create({
                data: {
                    tenantId,
                    bankAccountId,
                    statementDate,
                    transactions: {
                        create: transactions.map(t => ({
                            transactionDate: new Date(t.date),
                            description: t.description,
                            amount: t.amount,
                            currency: t.currency,
                            reference: t.reference
                        }))
                    }
                }
            });
            return statement;
        });
    }

    async getStatements(tenantId: string) {
        return await withTenantContext(tenantId, async (tx) => {
            return await tx.bankStatement.findMany({
                where: { tenantId },
                include: { bankAccount: true },
                orderBy: { statementDate: 'desc' }
            });
        });
    }
}

export const bankService = new BankService();
