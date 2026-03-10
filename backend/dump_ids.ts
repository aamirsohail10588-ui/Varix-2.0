import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const tenants = await prisma.tenant.findMany();
    const roles = await prisma.role.findMany();
    const userTenantRoles = await prisma.userTenantRole.findMany({
        include: { user: { select: { email: true } }, tenant: { select: { name: true } } }
    });

    let output = "--- USERS ---\n";
    users.forEach(u => output += `ID: ${u.id} | EMAIL: ${u.email}\n`);

    output += "\n--- TENANTS ---\n";
    tenants.forEach(t => output += `ID: ${t.id} | NAME: ${t.name}\n`);

    output += "\n--- ROLES ---\n";
    roles.forEach(r => output += `ID: ${r.id} | NAME: ${r.name} | TENANT_ID: ${r.tenantId}\n`);

    output += "\n--- USER_TENANT_ROLES ---\n";
    userTenantRoles.forEach(r => {
        output += `USER_ID: ${r.userId} | EMAIL: ${r.user.email} | TENANT_ID: ${r.tenantId} | TENANT: ${r.tenant.name} | ROLE_ID: ${r.roleId}\n`;
    });

    fs.writeFileSync("db_full_dump.txt", output);
    console.log("Dumped to db_full_dump.txt");
}

main().catch(console.error).finally(() => prisma.$disconnect());
