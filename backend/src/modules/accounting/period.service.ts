/**
 * MODULE: Period Governance Service
 * PATH: src/modules/accounting/period.service.ts
 */

import prisma from "../../infrastructure/prisma";

export class PeriodService {
    /**
     * Check if a transaction date falls within a locked period
     */
    static async isPeriodLocked(tenantId: string, transactionDate: Date): Promise<boolean> {
        const periodName = this.getPeriodName(transactionDate);

        const lock = await prisma.periodLock.findUnique({
            where: {
                tenantId_periodName: {
                    tenantId,
                    periodName
                }
            }
        });

        return lock ? lock.isLocked : false;
    }

    /**
     * Lock a specific period for a tenant
     * Performs pre-check validations before locking
     */
    static async lockPeriod(tenantId: string, periodName: string, userId: string) {
        // 1. Pre-check: All reconciliation matches in this period must be COMMITTED (session-based)
        // Note: Future refinement would check dates specifically

        const openSessions = await prisma.reconciliationSession.count({
            where: {
                tenantId,
                status: "OPEN",
                period: periodName
            }
        });

        if (openSessions > 0) {
            throw new Error(`Cannot lock period ${periodName}: There are ${openSessions} open reconciliation sessions.`);
        }

        // 2. Apply the lock
        return await (prisma as any).periodLock.upsert({
            where: {
                tenantId_periodName: {
                    tenantId,
                    periodName
                }
            },
            create: {
                tenantId,
                periodName,
                isLocked: true,
                lockedAt: new Date(),
                lockedById: userId
            },
            update: {
                isLocked: true,
                lockedAt: new Date(),
                lockedById: userId
            }
        });
    }

    /**
     * Unlock a period (Requires high-level auth, usually handled by middleware/controller)
     */
    static async unlockPeriod(tenantId: string, periodName: string) {
        return await (prisma as any).periodLock.update({
            where: {
                tenantId_periodName: {
                    tenantId,
                    periodName
                }
            },
            data: {
                isLocked: false,
                lockedAt: null,
                lockedById: null
            }
        });
    }

    /**
     * Helper to derive period name (YYYY-MM format)
     */
    private static getPeriodName(date: Date): string {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
}
