import { PrismaClient } from "@prisma/client";
import { syncConnector } from "./src/services/connector.service";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
    try {
        const connectors = await prisma.erpConnector.findMany({
            where: { connector_type: "ZOHO_CONNECTOR" }
        });

        if (connectors.length === 0) {
            console.log("No ZOHO_CONNECTOR found in database.");
            return;
        }

        try {
            await syncConnector(connectors[0].id);
        } catch (e: any) {
            fs.writeFileSync("zoho_error_log.json", JSON.stringify({
                message: e.message,
                response_data: e.response?.data,
                status: e.response?.status
            }, null, 2));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
