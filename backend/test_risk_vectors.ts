import { analyticsService } from "./src/modules/analytics/analytics.service";
import prisma from "./src/infrastructure/prisma";

async function verify() {
    try {
        console.log("1. Fetching active Tenant Context...");
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No tenant found!");

        const d = new Date();
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        console.log(`2. Calculating Mathematically Scaled Sub-Risks for Tenant ${tenant.id}...`);
        const metrics = await analyticsService.calculatePeriodRisk(tenant.id, period);

        console.log("Normalized Risk Vector Result:");
        console.dir(metrics, { depth: null });

        process.exit(0);
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
}

verify();
