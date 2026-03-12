/**
 * MODULE: Predictive Modeling Service
 * PATH: src/modules/intelligence/predictive.service.ts
 *
 * Responsibilities:
 * - Cash Flow Forecasting (Historical Trend Analysis)
 * - Risk Probability Scoring
 * - Future Financial Distress Prediction
 */

import prisma from "../../infrastructure/prisma";

export interface ForecastPoint {
    period: string;
    amount: number;
    confidenceHigh: number;
    confidenceLow: number;
}

export class PredictiveService {
    /**
     * Predict cash flow for the next N months
     */
    static async predictCashFlow(tenantId: string, months: number = 6): Promise<ForecastPoint[]> {
        // Get Asset and Liability account IDs first to avoid join type issues
        const targetAccounts = await prisma.account.findMany({
            where: { tenantId, type: { in: ["ASSET", "LIABILITY"] } },
            select: { id: true }
        });
        const accountIds = targetAccounts.map(a => a.id);

        // Get last 12 months of net cash flow
        const history = await prisma.ledgerEntry.groupBy({
            by: ['transaction_date'],
            where: {
                tenant_id: tenantId,
                account_id: { in: accountIds }
            },
            _sum: { debit_amount: true, credit_amount: true },
            orderBy: { transaction_date: 'desc' },
            take: 100
        });

        // Simple Linear Moving Average for prototype
        let totalNet = 0;
        history.forEach(h => {
            totalNet += parseFloat(h._sum.debit_amount?.toString() || "0") - parseFloat(h._sum.credit_amount?.toString() || "0");
        });
        const averageNet = history.length === 0 ? 0 : totalNet / history.length;

        const forecast: ForecastPoint[] = [];
        const now = new Date();

        for (let i = 1; i <= months; i++) {
            const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const period = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

            // Apply a slight growth/decay factor for realism
            const predictedAmount = averageNet * (1 + (i * 0.02));

            forecast.push({
                period,
                amount: predictedAmount,
                confidenceHigh: predictedAmount * 1.2,
                confidenceLow: predictedAmount * 0.8
            });
        }

        return forecast;
    }

    /**
     * Predict Risk Probability
     * Analyzes trends in FHI and Anomaly counts
     */
    static async predictRiskProbability(tenantId: string): Promise<{ probability: number; factors: string[] }> {
        const history = await prisma.financialHealthIndex.findMany({
            where: { tenant_id: tenantId },
            orderBy: { period: 'desc' },
            take: 3
        });

        if (history.length < 2) return { probability: 10, factors: ["Insufficient historical data for trend analysis"] };

        const latest = history[0].final_score;
        const previous = history[1].final_score;
        const trend = latest - previous;

        let probability = 20; // Base risk
        const factors = [];

        if (trend < -5) {
            probability += 30;
            factors.push("Significant downward trend in Financial Health Index");
        }

        if (latest < 60) {
            probability += 20;
            factors.push("Critical Financial Health Score");
        }

        // Check for unresolved anomalies
        const openAnomalies = await (prisma as any).anomalyAlert.count({
            where: { tenantId, status: "OPEN", severity: "CRITICAL" }
        });

        if (openAnomalies > 5) {
            probability += 25;
            factors.push(`High volume of unresolved critical anomalies (${openAnomalies})`);
        }

        return {
            probability: Math.min(100, probability),
            factors
        };
    }
}
