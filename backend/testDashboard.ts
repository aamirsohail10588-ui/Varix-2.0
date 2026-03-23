import { analyticsService } from "./src/modules/analytics/analytics.service";
import prisma from "./src/infrastructure/prisma";

async function run() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) return console.log("No tenant found in DB to test with.");
        console.log(`Testing dashboard metrics calculation for Tenant: ${tenant.id}...`);
        const [violations, closeProgress, volume] = await Promise.all([
            analyticsService.getControlViolations(tenant.id),
            analyticsService.getCloseProgress(tenant.id),
            analyticsService.getLedgerVolume(tenant.id)
        ]);
        const res = { violations, closeProgress, volume };
        console.log("Success! Data:", res);
    } catch (error) {
        console.error("Dashboard Service crashed with error:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
run();
