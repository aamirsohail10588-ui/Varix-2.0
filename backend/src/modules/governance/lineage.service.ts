/**
 * SERVICE: Data Lineage & Provenance
 * PATH: src/modules/governance/lineage.service.ts
 */

import prisma from "../../infrastructure/prisma";
import * as crypto from "crypto";

export class LineageService {
    /**
     * Generate a SHA-256 provenance hash for a record
     */
    static generateHash(data: any): string {
        const str = JSON.stringify(data);
        return crypto.createHash("sha256").update(str).digest("hex");
    }

    /**
     * Record a parent-child relationship in the lineage trail
     */
    static async recordTrail(
        tenantId: string,
        childType: string,
        childId: string,
        parentType: string,
        parentId: string,
        transformation: string
    ) {
        return prisma.lineageTrail.create({
            data: {
                tenant_id: tenantId,
                child_type: childType,
                child_id: childId,
                parent_type: parentType,
                parent_id: parentId,
                transformation
            }
        });
    }

    /**
     * Trace an entry back to its source
     * Returns a recursive graph of parents
     */
    static async traceBack(entityId: string, depth: number = 5): Promise<any[]> {
        if (depth === 0) return [];

        const trails = await prisma.lineageTrail.findMany({
            where: { child_id: entityId }
        });

        const result: any[] = [];
        for (const trail of trails) {
            const parent = {
                type: trail.parent_type,
                id: trail.parent_id,
                transformation: trail.transformation,
                parents: await this.traceBack(trail.parent_id, depth - 1)
            };
            result.push(parent);
        }

        return result;
    }

    /**
     * Verify if a record's current state matches its provenance hash
     */
    static async verifyIntegrity(entityId: string, entityType: "LedgerEntry" | "RawRecord"): Promise<boolean> {
        if (entityType === "LedgerEntry") {
            const entry = await prisma.ledgerEntry.findUnique({
                where: { id: entityId }
            });
            if (!entry || !entry.provenance_hash) return false;

            // Remove hash for re-calculation
            const { provenance_hash, ...data } = entry;
            const currentHash = this.generateHash(data);
            return currentHash === entry.provenance_hash;
        } else {
            const record = await prisma.rawRecord.findUnique({
                where: { id: entityId }
            });
            if (!record || !record.lineage_hash) return false;

            const { lineage_hash, ...data } = record;
            const currentHash = this.generateHash(data);
            return currentHash === record.lineage_hash;
        }
    }
}
