import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing old data via TRUNCATE CASCADE...');

    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "control_results" CASCADE;`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "control_runs" CASCADE;`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "risk_metrics" CASCADE;`); } catch (e) { }

    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ledger_entries" CASCADE;`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "raw_records" CASCADE;`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "snapshots" CASCADE;`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ingestion_batches" CASCADE;`); } catch (e) { }

    console.log('Cleared Ledger tables. Now generating new demo data...');

    const { generateDemoData } = require('./src/services/demo.service');

    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
        console.log('Running demo data for tenant:', tenant.id);
        await generateDemoData(tenant.id);
        console.log('Completed generating demo data.');
    } else {
        console.log('No tenant found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
