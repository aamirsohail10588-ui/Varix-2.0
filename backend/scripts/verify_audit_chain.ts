import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

async function verifyAuditChain() {
    console.log("--- VARIX Audit Chain Verification ---");

    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'asc' }
    });

    if (logs.length < 2) {
        console.log("ℹ️ Insufficient logs for chain verification.");
        return;
    }

    let isValid = true;
    for (let i = 1; i < logs.length; i++) {
        const current = logs[i];
        const previous = logs[i - 1];

        // Recalculate hash of current log to verify against stored hash
        const payload = JSON.stringify({
            tenantId: current.tenantId,
            userId: current.userId,
            action: current.action,
            entityType: current.entityType,
            entityId: current.entityId,
            details: current.details,
            prevHash: current.prevHash
        });

        const calculatedHash = crypto.createHash("sha256").update(payload).digest("hex");

        if (calculatedHash !== current.hash) {
            console.error(`❌ Hash Mismatch at Log ID ${current.id}`);
            isValid = false;
        }

        if (current.prevHash !== previous.hash) {
            console.error(`❌ Chain Broken at Log ID ${current.id}: prevHash does not match previous log's hash.`);
            isValid = false;
        }
    }

    if (isValid) {
        console.log(`✅ Audit Chain Verified: ${logs.length} logs are cryptographically linked and intact.`);
    } else {
        console.log("❌ Audit Chain Integrity Compromised.");
    }
}

verifyAuditChain().catch(console.error).finally(() => prisma.$disconnect());
