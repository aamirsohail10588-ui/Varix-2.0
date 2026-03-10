import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Global Access Repair...");

    const users = await prisma.user.findMany();
    const tenants = await prisma.tenant.findMany();

    // Get or create a Global Admin role for each tenant
    for (const tenant of tenants) {
        let adminRole = await prisma.role.findFirst({
            where: { tenantId: tenant.id, name: "SUPER_ADMIN" }
        });

        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: { name: "SUPER_ADMIN", tenantId: tenant.id }
            });
        }

        for (const user of users) {
            const existing = await prisma.userTenantRole.findFirst({
                where: { userId: user.id, tenantId: tenant.id }
            });

            if (!existing) {
                await prisma.userTenantRole.create({
                    data: {
                        userId: user.id,
                        tenantId: tenant.id,
                        roleId: adminRole.id
                    }
                });
                console.log(`Granted access for ${user.email} -> ${tenant.name}`);
            }
        }
    }

    console.log("Access Repair Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
