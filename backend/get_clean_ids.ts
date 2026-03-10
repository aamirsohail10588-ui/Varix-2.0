import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("--- ROLES ---");
    const roles = await prisma.userTenantRole.findMany({
        include: { user: true, tenant: true }
    });
    for (const r of roles) {
        console.log(`USER_ID: ${r.userId} | USER_EMAIL: ${r.user.email} | TENANT_ID: ${r.tenantId} | TENANT_NAME: ${r.tenant.name}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
