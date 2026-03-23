import { ingestionService } from "./src/modules/ingestion/ingestion.service";
import prisma from "./src/infrastructure/prisma";
import fs from "fs";

const csvData = `Account,Debit Amount,Credit Amount,Currency,Transaction Date,invoice_number,voucher_number
CASH,15000,0,USD,2026-03-01,INV-100,1001
SALES,0,15000,USD,2026-03-01,,1001
RENT,5000,0,USD,2026-03-02,INV-200,1002
BANK,0,5000,USD,2026-03-02,,1002`;

fs.writeFileSync('mock_ingest.csv', csvData);

async function runTest() {
    try {
        console.log("1. Fetching active Tenant Context...");
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No tenant found!");

        console.log("2. Creating Mock Ingestion Batch...");
        const batch = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenant.id,
                source_type: "api_upload",
                file_name: "mock_ingest.csv",
                status: "processing"
            }
        });

        console.log(`3. Executing Canonical Ingestion Pipeline (${batch.id})...`);
        await ingestionService.processCsv('mock_ingest.csv', tenant.id, batch.id);

        console.log("4. Validating Ledger Entries...");
        const entries = await prisma.ledgerEntry.findMany({ where: { snapshot_id: { not: null } } });
        console.log(`Successfully mapped ${entries.length} Ledger rows!`);

        const controls = await prisma.controlResult.findMany();
        console.log(`Generated ${controls.length} Post-Normalization Control Results!`);

        process.exit(0);
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
}

runTest();
