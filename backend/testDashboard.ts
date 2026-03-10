import { getDashboardMetrics } from "./src/services/dashboard.service";
import prisma from "./src/lib/prisma";

async function run() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) return console.log("No tenant found in DB to test with.");
        console.log(`Testing dashboard metrics calculation for Tenant: ${tenant.id}...`);
        const res = await getDashboardMetrics(tenant.id, "2026-Q1");
        console.log("Success! Data:", res);
    } catch (error) {
        console.error("Dashboard Service crashed with error:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
run();
