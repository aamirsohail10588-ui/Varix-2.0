import prisma from "../../infrastructure/prisma";

export class AccountingService {

    async getLedgerEntries(tenantId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const entries = await prisma.ledgerEntry.findMany({
            where: { tenant_id: tenantId },
            include: { account: true },
            orderBy: { transaction_date: 'desc' },
            skip,
            take: limit
        });

        const count = await prisma.ledgerEntry.count({ where: { tenant_id: tenantId } });
        return { data: entries, meta: { total: count, page, limit } };
    }

    async getLedgerSummary(tenantId: string, period?: string) {

        const where: any = { tenant_id: tenantId };

        if (period) {
            where.posting_period = period;
        }

        const summary = await prisma.ledgerEntry.aggregate({
            where,
            _sum: { debit_amount: true, credit_amount: true },
            _count: { id: true }
        });

        return {
            totalRows: summary._count.id,
            totalDebits: Number(summary._sum.debit_amount || 0),
            totalCredits: Number(summary._sum.credit_amount || 0),
            isBalanced: Math.abs(Number(summary._sum.debit_amount || 0) - Number(summary._sum.credit_amount || 0)) < 0.01
        };
    }
}

export const accountingService = new AccountingService();
