/**
 * MODULE: Feature Engineering Service
 * PATH: src/modules/intelligence/features.service.ts
 *
 * Responsibilities:
 * - Extract statistical features from LedgerEntries
 * - Compute Z-scores for transaction amounts relative to historical tenant data
 * - Flag high-variance transactions
 */

import prisma from "../../infrastructure/prisma";

export interface AnomalyFeatures {
    zScore: number;
    isHighVariance: boolean;
    historicalMean: number;
    historicalStdDev: number;
}

export class FeatureEngineeringService {
    /**
     * Compute statistical features for a single transaction amount
     */
    static async getAmountFeatures(tenantId: string, accountId: string, amount: number): Promise<AnomalyFeatures> {
        // Fetch historical transactions for this account/tenant to build a profile
        // In a production system, we'd use an aggregated stats table or Redis
        const historicalData = await (prisma as any).ledgerEntry.findMany({
            where: {
                tenant_id: tenantId,
                account_id: accountId,
                transaction_date: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                }
            },
            select: {
                debit_amount: true,
                credit_amount: true
            },
            take: 1000
        });

        if (historicalData.length < 5) {
            // Insufficient data to compute meaningful stats
            return { zScore: 0, isHighVariance: false, historicalMean: amount, historicalStdDev: 0 };
        }

        const amounts = historicalData.map((d: any) =>
            Math.max(parseFloat(d.debit_amount), parseFloat(d.credit_amount))
        );

        const mean = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        const zScore = stdDev === 0 ? 0 : Math.abs(amount - mean) / stdDev;

        // Threshold of 3.0 sigma for "High Variance" (standard statistical outlier)
        return {
            zScore,
            isHighVariance: zScore > 3.0,
            historicalMean: mean,
            historicalStdDev: stdDev
        };
    }

    /**
     * Identifies if a transaction occurs at an unusual time for this tenant
     */
    static isUnusualTiming(transactionDate: Date): boolean {
        const hour = transactionDate.getHours();
        // Flag transactions occurring between 11 PM and 5 AM as "Unusual Timing"
        return hour >= 23 || hour <= 5;
    }
}
