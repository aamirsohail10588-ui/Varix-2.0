/**
 * MODULE: Planning Service
 * PATH: src/services/planning.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import prisma from "../infrastructure/prisma"
import { Decimal } from "decimal.js";

export class PlanningService {

    async createBudget(
        tenantId: string,
        name: string,
        period: string,
        totalAmount: number
    ) {
        // Schema field is 'amount' not 'totalAmount'
        return prisma.budget.create({
            data: {
                tenantId,
                name,
                period,
                amount: totalAmount,
                version: "v1",
                status: "ACTIVE",
            },
        });
    }

    async runVarianceAnalysis(
        tenantId: string,
        period: string,
        actualAmount: number
    ) {
        const activeBudget = await prisma.budget.findFirst({
            where: { tenantId, period, status: "ACTIVE" },
        });

        if (!activeBudget) {
            throw new Error(`No active budget found for period ${period}`);
        }

        // Schema field is 'amount' not 'totalAmount'
        const actual = new Decimal(actualAmount);
        const budget = new Decimal(activeBudget.amount.toString());
        const variance = actual.minus(budget);

        return prisma.varianceRecord.create({
            data: {
                tenantId,
                period,
                actual: actual.toNumber(),
                budget: budget.toNumber(),
                variance: variance.toNumber(),
                explanation: variance.isNegative() ? "Below budget" : "Exceeded budget",
            },
        });
    }

    async createForecast(
        tenantId: string,
        budgetId: string,
        versionName: string
    ) {
        const budget = await prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) throw new Error("Source budget not found.");

        // Schema: ForecastVersion has no 'status' field
        return prisma.forecastVersion.create({
            data: {
                tenantId,
                budgetId,
                name: versionName,
                amount: budget.amount,
            },
        });
    }
}

export const planningService = new PlanningService();