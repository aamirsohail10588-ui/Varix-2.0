import { calculateNormalizedIntegrity } from "./src/services/integrity.service";
import prisma from "./src/lib/prisma";

async function runTest() {
    try {
        console.log("1. Fetching active Tenant Context...");
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No tenant found!");

        console.log(`2. Calculating Mathematically Scaled Integrity for Tenant ${tenant.id}...`);
        const metrics = await calculateNormalizedIntegrity(tenant.id);

        console.log("Normalized Metrics Finalized Result:");
        console.dir(metrics, { depth: null });

        process.exit(0);
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
}

runTest();
