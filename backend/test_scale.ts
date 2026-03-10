import prisma from "./src/lib/prisma";
import { processEnterpriseCsvUpload } from "./src/services/ingestion.service";
import path from "path";

async function runScaleTest() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No tenant found!");

        const filePath = path.join(__dirname, "..", "varix_enterprise_dataset.csv");

        console.log(`[Scale Test] Starting Ingestion for 1M rows on Tenant ${tenant.id}...`);

        const batch = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenant.id,
                source_type: "SCALE_TEST",
                file_name: "varix_enterprise_dataset.csv",
                status: "pending"
            }
        });

        console.time("IngestionTime");
        await processEnterpriseCsvUpload(filePath, "varix_enterprise_dataset.csv", tenant.id, batch.id);
        console.timeEnd("IngestionTime");

        const recordCount = await prisma.ledgerEntry.count({ where: { ingestion_batch_id: batch.id } });
        console.log(`[Scale Test] Successfully ingested ${recordCount.toLocaleString()} ledger entries!`);

        process.exit(0);
    } catch (e) {
        console.error("Scale Test Failed:", e);
        process.exit(1);
    }
}

runScaleTest();
