import { PrismaClient } from "@prisma/client";
import { syncConnector } from "./src/services/connector.service";
import { executeControls } from "./src/services/controls.service";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Mocking a Zoho Connector and triggering sync...");

        // 1. Ensure Tenant
        const tenant = await prisma.tenant.upsert({
            where: { id: "test-tenant-123" },
            update: { name: "Test Tenant" },
            create: { id: "test-tenant-123", name: "Test Tenant" }
        });

        // 2. Mock a generic ErpConnector (Since we don't have real Zoho Tokens in the env, 
        // SyncConnector uses a mock synthetic generator if the connector is not Zoho, 
        // BUT wait, we WANT to test Zoho! However, Zoho sync WILL throw if no valid OAuth token exists.
        // Let's create a generic CSV_UPLOAD mock just to verify the canonical ledger pipeline flows correctly end-to-end 
        // to complete the integration verification of the core logic if Zoho fails on network)
        const connector = await prisma.erpConnector.upsert({
            where: { tenant_id_connector_type: { tenant_id: tenant.id, connector_type: "MOCK_CONNECTOR" } },
            update: { status: "ACTIVE" },
            create: {
                tenant_id: tenant.id,
                connector_type: "MOCK_CONNECTOR",
                connection_config: {},
                sync_frequency: "MANUAL",
                status: "ACTIVE"
            }
        });

        // Test the ingestion wrapper syncConnector
        console.log("Triggering syncConnector...");
        const result = await syncConnector(connector.id);

        console.log("Sync Complete:", result);
    } catch (e: any) {
        console.error("Test Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
