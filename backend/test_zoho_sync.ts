import { PrismaClient } from "@prisma/client";
import { syncZohoBooks } from "./src/services/zohobooks.service";

const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Preparing Tenant...");
        let tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            tenant = await prisma.tenant.create({ data: { name: "Integration Test Tenant" } });
        }

        console.log(`Tenant ID: ${tenant.id}`);

        console.log("Setting up mock Zoho connector...");
        let connector = await prisma.erpConnector.findFirst({
            where: { tenant_id: tenant.id, connector_type: "ZOHO_CONNECTOR" }
        });

        if (!connector) {
            connector = await prisma.erpConnector.create({
                data: {
                    tenant_id: tenant.id,
                    connector_type: "ZOHO_CONNECTOR",
                    connection_config: { api_key: "MOCK_KEY_123" },
                    sync_frequency: "DAILY",
                    status: "ACTIVE"
                }
            });
        } else {
            await prisma.erpConnector.update({
                where: { id: connector.id },
                data: { connection_config: { api_key: "MOCK_KEY_123" } }
            })
        }

        console.log(`Running sync for Connector ID: ${connector.id}`);
        const result = await syncZohoBooks(connector.id);
        console.log("Sync Result:", result);

        const batches = await prisma.ingestionBatch.findMany({
            where: { tenant_id: tenant.id, source_type: "ZOHO_CONNECTOR" },
            orderBy: { created_at: 'desc' },
            take: 1
        });

        if (batches.length > 0) {
            console.log(`Created Batch ID: ${batches[0].id}`);
            const records = await prisma.rawRecord.count({ where: { batch_id: batches[0].id } });
            console.log(`Records linked to batch: ${records}`);
        } else {
            console.log("No batch created.");
        }

    } catch (e) {
        console.error("Error during test:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
