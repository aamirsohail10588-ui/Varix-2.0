import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
    try {
        const connectors = await prisma.erpConnector.findMany();
        console.log("Connectors found:", connectors);
    } catch (e: any) {
        console.error("Prisma Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
