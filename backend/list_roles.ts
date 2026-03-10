import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.userTenantRole.findMany({
        include: { user: true, tenant: true }
    });
    roles.forEach(x => {
        console.log(`USER: ${x.user.email} | TENANT: ${x.tenant.name} | TENANT_ID: ${x.tenantId}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
