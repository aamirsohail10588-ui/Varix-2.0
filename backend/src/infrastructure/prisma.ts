import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const setTenantContext = async (tenantId: string, tx?: any) => {
    // Set the tenant ID for the current transaction only (Transaction-Scoped)
    // This is safe for connection pooling as it doesn't persist across transactions
    const client = tx || prisma;
    await client.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
};

/**
 * Executes a callback within a Prisma transaction, automatically setting the RLS tenant context.
 */
export const withTenantContext = async <T>(tenantId: string, callback: (tx: any) => Promise<T>): Promise<T> => {
    return await prisma.$transaction(async (tx) => {
        await setTenantContext(tenantId, tx);
        return await callback(tx);
    });
};

export default prisma;
