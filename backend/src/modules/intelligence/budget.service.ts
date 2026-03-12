/**
 * MODULE: Budget Management Service
 * PATH: src/modules/intelligence/budget.service.ts
 *
 * Responsibilities:
 * - Create and manage financial budgets for tenants
 * - Retrieve budget items for variance analysis
 */

import prisma from "../../infrastructure/prisma";
import { Prisma } from "@prisma/client";

export interface BudgetItemInput {
    accountId: string;
    amount: number;
    period?: string;
}

export class BudgetService {
    /**
     * Create a new budget for a tenant
     */
    static async createBudget(tenantId: string, name: string, fiscalYear: number, items: BudgetItemInput[]) {
        return await (prisma as any).budget.create({
            data: {
                tenantId,
                name,
                fiscalYear,
                status: "ACTIVE",
                items: {
                    create: items.map(item => ({
                        accountId: item.accountId,
                        amount: new Prisma.Decimal(item.amount),
                        period: item.period
                    }))
                }
            },
            include: {
                items: true
            }
        });
    }

    /**
     * Get budget details for a tenant and year
     */
    static async getActiveBudget(tenantId: string, fiscalYear: number) {
        return await (prisma as any).budget.findFirst({
            where: {
                tenantId,
                fiscalYear,
                status: "ACTIVE"
            },
            include: {
                items: {
                    include: {
                        account: true
                    }
                }
            }
        });
    }

    /**
     * Get a specific budget item
     */
    static async getBudgetItem(tenantId: string, fiscalYear: number, accountId: string, period?: string) {
        const budget = await this.getActiveBudget(tenantId, fiscalYear);
        if (!budget) return null;

        return budget.items.find((item: any) =>
            item.accountId === accountId && (!period || item.period === period)
        );
    }
}
