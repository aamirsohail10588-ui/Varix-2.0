import prisma from '../src/lib/prisma';
import crypto from 'crypto';

beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    // Generate temporary RS256 Keypair for tests
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
});

afterAll(async () => {
    await prisma.$disconnect();
});

export const clearDatabase = async () => {
    const tablenames = await prisma.$queryRaw<
        Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_migrations';`;

    for (const { tablename } of tablenames) {
        if (tablename !== 'SpatialRefSys') {
            try {
                await prisma.$executeRawUnsafe(
                    `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
                );
            } catch (error) {
                // Ignore errors on missing tables or system tables
            }
        }
    }
};
