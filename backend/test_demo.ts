import { generateDemoData } from "./src/services/demo.service";
import prisma from "./src/infrastructure/prisma";

async function runTest() {
    try {
        console.log("1. Fetching active Tenant Context...");
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No tenant found!");

        console.log(`2. Generating 10,000 Financial Records for Tenant ${tenant.id}...`);
        console.time("GenerationTime");
        const result = await generateDemoData(tenant.id);
        console.timeEnd("GenerationTime");

        console.log("Result:", result);

        console.log("3. Validating Post-Generation States...");
        const entriesCount = await prisma.ledgerEntry.count({ where: { tenant_id: tenant.id } });
        console.log(`Successfully mapped ${entriesCount} Ledger rows!`);

        const controls = await prisma.controlResult.count({ where: { controlRun: { tenantId: tenant.id } } });
        console.log(`Generated ${controls} Post-Normalization Control Results logically breaching spec thresholds!`);

        process.exit(0);
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
}

runTest();
