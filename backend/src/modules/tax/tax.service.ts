/**
 * MODULE: Tax Compliance Engine
 * PATH: src/modules/tax/tax.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export class TaxService {
    /**
     * Calculate expected tax amount for a transaction
     */
    static async calculateExpectedTax(tenantId: string, amount: number, taxCode: string, date: Date = new Date()): Promise<number> {
        const rateRecord = await (prisma as any).taxRate.findFirst({
            where: {
                taxCode,
                effectiveFrom: { lte: date },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: date } }
                ],
                jurisdiction: {
                    tenantId
                }
            }
        });

        if (!rateRecord) {
            console.warn(`[TaxService] No active tax rate found for code ${taxCode} on ${date.toISOString()}`);
            return 0;
        }

        const rate = Number(rateRecord.rate);
        return (amount * rate) / 100;
    }

    /**
     * Validate tax posting for a ledger entry
     * Returns a variance if the posted tax differs from the expected rate
     */
    static async validateTaxPosting(tenantId: string, ledgerEntry: any): Promise<{ isCompliant: boolean; variance: number }> {
        if (!ledgerEntry.tax_code) return { isCompliant: true, variance: 0 };

        const netAmount = Math.abs(Number(ledgerEntry.debit_amount) - Number(ledgerEntry.credit_amount));
        const expectedTax = await this.calculateExpectedTax(tenantId, netAmount, ledgerEntry.tax_code, ledgerEntry.transaction_date);
        const postedTax = Number(ledgerEntry.tax_amount || 0);

        const variance = postedTax - expectedTax;

        // Variance threshold of 0.5% of expected tax or 0.01 absolute
        const threshold = Math.max(0.01, expectedTax * 0.005);
        const isCompliant = Math.abs(variance) <= threshold;

        return { isCompliant, variance };
    }

    /**
     * Lookup tax rate by ID
     */
    static async getTaxRateById(id: string) {
        return await (prisma as any).taxRate.findUnique({
            where: { id }
        });
    }
}
