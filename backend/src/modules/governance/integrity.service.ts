/**
 * MODULE: Ledger Integrity Service
 * PATH: src/modules/governance/integrity.service.ts
 */

import prisma from "../../infrastructure/prisma";
import crypto from "crypto";

export class IntegrityService {
    /**
     * Validate Double-Entry integrity for a batch
     * Ensures Debits = Credits
     */
    static async validateDoubleEntry(batchId: string): Promise<{ isValid: boolean; imbalance: number }> {
        const result = await (prisma as any).ledgerEntry.aggregate({
            where: { ingestion_batch_id: batchId },
            _sum: {
                debit_amount: true,
                credit_amount: true
            }
        });

        const debits = Number(result._sum.debit_amount || 0);
        const credits = Number(result._sum.credit_amount || 0);
        const imbalance = debits - credits;

        return {
            isValid: Math.abs(imbalance) < 0.0001,
            imbalance
        };
    }

    /**
     * Generate a cryptographic seal (Merkle-style root) for a batch
     * This "freezes" the batch by storing a combined hash of all entries
     */
    static async generateBatchSeal(tenantId: string, batchId: string, userId?: string) {
        const entries = await prisma.ledgerEntry.findMany({
            where: { ingestion_batch_id: batchId },
            orderBy: { id: "asc" }
        });

        if (entries.length === 0) {
            throw new Error(`Cannot seal empty batch: ${batchId}`);
        }

        // 1. Calculate individual entry hashes and combine into a Merkle root
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

        const combinedHash = crypto.createHash('sha256').update(entryHashes.join('')).digest('hex');

        // 2. Persist the seal
        return await (prisma as any).integritySeal.upsert({
            where: { batchId },
            create: {
                tenantId,
                batchId,
                sealHash: combinedHash,
                sealedById: userId
            },
            update: {
                sealHash: combinedHash,
                sealedAt: new Date(),
                sealedById: userId
            }
        });
    }
}
