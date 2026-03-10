import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.userTenantRole.findMany({
        include: {
            user: { select: { email: true } },
            tenant: { select: { name: true, id: true } }
        }
    });

    const tenants = await prisma.tenant.findMany();
    const users = await prisma.user.findMany();
    const connectors = await prisma.erpConnector.findMany();

    console.log(JSON.stringify({
        roles,
        tenants,
        users,
        connectors
    }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
