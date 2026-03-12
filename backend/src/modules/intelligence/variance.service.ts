/**
 * MODULE: Variance Analysis Engine
 * PATH: src/modules/intelligence/variance.service.ts
 *
 * Responsibilities:
 * - Compare actual ledger totals against budget targets
 * - Calculate absolute and percentage variance
 */

import prisma from "../../infrastructure/prisma";
import { Prisma } from "@prisma/client";
import { BudgetService } from "./budget.service";

export interface VarianceReport {
    accountId: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
    status: "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";
}

export class VarianceService {
    /**
     * Calculate variance for a specific account and period
     */
    static async calculateVariance(tenantId: string, fiscalYear: number, accountId: string, period?: string): Promise<VarianceReport | null> {
        const budgetItem = await BudgetService.getBudgetItem(tenantId, fiscalYear, accountId, period);
        if (!budgetItem) return null;

        // Sum actuals from the canonical ledger
        const actuals = await (prisma as any).ledgerEntry.aggregate({
            _sum: {
                debit_amount: true,
                credit_amount: true
            },
            where: {
                tenant_id: tenantId,
                account_id: accountId,
                // In a real system, we'd filter by the specific period dates
                // For prototype, we'll assume fiscal year match
                transaction_date: {
                    gte: new Date(`${fiscalYear}-01-01`),
                    lte: new Date(`${fiscalYear}-12-31`)
                }
            }
        });

        const actualAmount = Math.max(
            parseFloat(actuals._sum.debit_amount?.toString() || "0"),
            parseFloat(actuals._sum.credit_amount?.toString() || "0")
        );

        const budgetedAmount = parseFloat(budgetItem.amount.toString());
        const variance = budgetedAmount - actualAmount;
        const variancePercentage = budgetedAmount === 0 ? 0 : (variance / budgetedAmount) * 100;

        return {
            accountId,
            budgeted: budgetedAmount,
            actual: actualAmount,
            variance,
            variancePercentage,
            status: variance >= 0 ? "FAVORABLE" : "UNFAVORABLE"
        };
    }

    /**
     * Get full variance report for active budget
     */
    static async getFullReport(tenantId: string, fiscalYear: number) {
        const budget = await BudgetService.getActiveBudget(tenantId, fiscalYear);
        if (!budget) return [];

        const reports = [];
        for (const item of budget.items) {
            const report = await this.calculateVariance(tenantId, fiscalYear, item.accountId, item.period);
            if (report) reports.push(report);
        }

        return reports;
    }
}
