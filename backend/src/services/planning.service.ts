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
        const fiscalYear = parseFiscalYear(period);

        const budget = await prisma.budget.create({
            data: {
                tenantId,
                name,
                fiscalYear,
                status: "ACTIVE",
            },
        });

        await prisma.forecastVersion.create({
            data: {
                tenantId,
                budgetId: budget.id,
                name: "v1",
                amount: totalAmount,
            },
        });

        return budget;
    }

    async runVarianceAnalysis(
        tenantId: string,
        period: string,
        actualAmount: number
    ) {
        const fiscalYear = parseFiscalYear(period);

        const activeBudget = await prisma.budget.findFirst({
            where: { tenantId, fiscalYear, status: "ACTIVE" },
        });

        if (!activeBudget) {
            throw new Error(`No active budget found for period ${period}`);
        }

        const latestForecast = await prisma.forecastVersion.findFirst({
            where: { budgetId: activeBudget.id },
            orderBy: { createdAt: "desc" },
        });

        if (!latestForecast) {
            throw new Error(`No forecast version found for budget ${activeBudget.id}`);
        }

        const actual = new Decimal(actualAmount);
        const budget = new Decimal(latestForecast.amount.toString());
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
        const latestForecast = await prisma.forecastVersion.findFirst({
            where: { budgetId },
            orderBy: { createdAt: "desc" },
        });

        if (!latestForecast) throw new Error("No existing forecast version found for this budget.");

        return prisma.forecastVersion.create({
            data: {
                tenantId,
                budgetId,
                name: versionName,
                amount: latestForecast.amount,
            },
        });
    }
}

function parseFiscalYear(period: string): number {
    const match = period.match(/^(\d{4})/);
    if (!match) throw new Error(`Cannot parse fiscal year from period: "${period}"`);
    return parseInt(match[1]);
}

export const planningService = new PlanningService();