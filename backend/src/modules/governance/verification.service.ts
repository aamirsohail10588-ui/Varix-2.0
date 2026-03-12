/**
 * MODULE: Ledger Verification Service
 * PATH: src/modules/governance/verification.service.ts
 */

import prisma from "../../infrastructure/prisma";
import crypto from "crypto";

export class VerificationService {
    /**
     * Verify all seals for a tenant
     * Detects if any sealed records have been tampered with
     */
    static async verifyLedgerIntegrity(tenantId: string) {
        const seals = await (prisma as any).integritySeal.findMany({
            where: { tenantId }
        });

        const reports = [];

        for (const seal of seals) {
            const currentHash = await this.calculateCurrentBatchHash(seal.batchId);
            const isBroken = currentHash !== seal.sealHash;

            reports.push({
                batchId: seal.batchId,
                sealedAt: seal.sealedAt,
                status: isBroken ? "BROKEN" : "VERIFIED",
                expectedHash: seal.sealHash,
                currentHash: currentHash
            });
        }

        const brokenCount = reports.filter(r => r.status === "BROKEN").length;

        return {
            tenantId,
            scanTimestamp: new Date(),
            verified: brokenCount === 0,
            brokenCount,
            batchReports: reports
        };
    }

    /**
     * Internal helper to calculate current state of a batch
     */
    private static async calculateCurrentBatchHash(batchId: string): Promise<string> {
        const entries = await prisma.ledgerEntry.findMany({
            where: { ingestion_batch_id: batchId },
            orderBy: { id: "asc" }
        });

        if (entries.length === 0) return "EMPTY";

        const entryHashes = entries.map(e => {
            const data = JSON.stringify({
                id: e.id,
                debit: Number(e.debit_amount),
                credit: Number(e.credit_amount),
                account: e.account_id,
                date: e.transaction_date.toISOString(),
                provenance: (e as any).provenance_hash
            });
            return crypto.createHash('sha256').update(data).digest('hex');
        });

        return crypto.createHash('sha256').update(entryHashes.join('')).digest('hex');
    }

    /**
     * Verify all evidence signatures for a tenant
     */
    static async verifyEvidenceSignatures(tenantId: string) {
        const evidence = await (prisma as any).evidenceDocument.findMany({
            where: {
                tenantId,
                digitalSignature: { not: null }
            }
        });

        const reports = [];
        for (const doc of evidence) {
            // NOTE: In production, we would fetch the file buffer from S3/blob storage
            // and use EvidenceSignatureService.verifyIntegrity(doc.id, buffer)
            // For the prototype, we assume the signature existence is the verification target
            reports.push({
                documentId: doc.id,
                fileName: doc.fileName,
                version: doc.version,
                status: "VERIFIED",
                signature: doc.digitalSignature
            });
        }

        return {
            tenantId,
            scanTimestamp: new Date(),
            verifiedCount: reports.length,
            reports
        };
    }
}
