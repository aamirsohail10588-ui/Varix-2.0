import cron from "node-cron";
import prisma from "../infrastructure/prisma";
import { analyticsService } from "../modules/analytics/analytics.service";

export const startCronJobs = () => {
    // Run daily at midnight: "0 0 * * *"
    // This job iterates over all active tenants and recalculates their risk score for the current period
    cron.schedule("0 0 * * *", async () => {
        console.log("[CRON] Starting Daily Financial Risk Calculations...");

        try {
            const tenants = await prisma.tenant.findMany({ select: { id: true } });

            const d = new Date();
            const currentPeriod = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;

            let successCount = 0;
            let failureCount = 0;

            for (const t of tenants) {
                try {
                    await analyticsService.calculatePeriodRisk(t.id, currentPeriod);
                    successCount++;
                } catch (e) {
                    console.error(`[CRON] Failed to calculate risk for tenant ${t.id}:`, e);
                    failureCount++;
                }
            }

            console.log(`[CRON] Daily Risk calculations completed. Success: ${successCount}. Failed: ${failureCount}.`);
        } catch (globalError) {
            console.error("[CRON] Fatal error executing daily risk calculations:", globalError);
        }
    });

    console.log("[CRON] Scheduled Jobs initialized successfully.");
};
