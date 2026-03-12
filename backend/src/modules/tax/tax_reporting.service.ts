/**
 * MODULE: Tax Reporting Service
 * PATH: src/modules/tax/tax_reporting.service.ts
 */

import prisma from "../../infrastructure/prisma";

export class TaxReportingService {
    /**
     * Generate a summary VAT/GST report for a period
     */
    static async generateTaxReport(tenantId: string, period: string) {
        // Implementation assumes period is YYYY-MM
        const startDate = new Date(`${period}-01`);
        const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

        const taxEntries = await (prisma.ledgerEntry as any).groupBy({
            by: ['tax_code'],
            where: {
                tenant_id: tenantId,
                transaction_date: {
                    gte: startDate,
                    lt: endDate
                },
                tax_code: { not: null }
            },
            _sum: {
                tax_amount: true,
                debit_amount: true,
                credit_amount: true
            }
        });

        const summary = taxEntries.map((entry: any) => ({
            taxCode: entry.tax_code,
            totalTaxableAmount: Math.abs(Number(entry._sum.debit_amount || 0) - Number(entry._sum.credit_amount || 0)),
            totalTaxCollected: Number(entry._sum.tax_amount || 0)
        }));

        const totalTaxable = summary.reduce((sum: number, item: any) => sum + item.totalTaxableAmount, 0);
        const totalTax = summary.reduce((sum: number, item: any) => sum + item.totalTaxCollected, 0);

        return {
            tenantId,
            period,
            generatedAt: new Date(),
            totalTaxable,
            totalTax,
            details: summary
        };
    }
}
