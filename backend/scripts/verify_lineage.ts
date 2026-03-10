import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyLineage() {
    console.log("--- VARIX Lineage Verification ---");

    const latestEntry = await (prisma as any).ledgerEntry.findFirst({
        where: { raw_record_id: { not: null } },
        orderBy: { createdAt: 'desc' }
    });

    if (!latestEntry) {
        console.log("❌ No lineage-aware ledger entries found. Please trigger a new ingestion.");
        return;
    }

    console.log(`✅ Found LedgerEntry: ${latestEntry.id}`);
    console.log(`   Linked RawRecord: ${latestEntry.raw_record_id}`);
    console.log(`   Linked Batch: ${latestEntry.ingestion_batch_id}`);
    console.log(`   Source ID: ${latestEntry.source_id}`);
    console.log(`   Confidence: ${latestEntry.confidence_score}%`);

    const rawRecord = await prisma.rawRecord.findUnique({
        where: { id: latestEntry.raw_record_id }
    });

    if (rawRecord) {
        console.log("✅ Lineage Chain Verified: Ledger -> RawRecord exists.");
    } else {
        console.log("❌ Lineage Chain Broken: RawRecord missing for LedgerEntry.");
    }
}

verifyLineage().catch(console.error).finally(() => prisma.$disconnect());
