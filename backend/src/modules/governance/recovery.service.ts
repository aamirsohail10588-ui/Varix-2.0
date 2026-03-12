/**
 * SERVICE: Point-in-time Recovery & Integrity Audit
 * PATH: src/modules/governance/recovery.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { LineageService } from "./lineage.service";

export class RecoveryService {
    /**
     * Reconstruct the ledger state for a tenant at a specific timestamp
     */
    static async getLedgerSnapshotAt(tenantId: string, timestamp: Date) {
        // Find all entries created at or before the timestamp
        return prisma.ledgerEntry.findMany({
            where: {
                tenant_id: tenantId,
                createdAt: { lte: timestamp }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    /**
     * Perform a global audit of a tenant's data integrity
     */
    static async fullIntegrityAudit(tenantId: string) {
        const issues: any[] = [];

        // Audit Ledger Entries
        const entries = await prisma.ledgerEntry.findMany({
            where: { tenant_id: tenantId }
        });

        for (const entry of entries) {
            const isValid = await LineageService.verifyIntegrity(entry.id, "LedgerEntry");
            if (!isValid) {
                issues.push({
                    type: "INTEGRITY_VIOLATION",
                    entity: "LedgerEntry",
                    id: entry.id,
                    severity: "CRITICAL",
                    detectedAt: new Date()
                });
            }
        }

        // Log issues to DataQualityIssue table
        if (issues.length > 0) {
            for (const issue of issues) {
                await prisma.dataQualityIssue.create({
                    data: {
                        tenantId,
                        batchId: "SYSTEM_AUDIT",
                        snapshotId: "SYSTEM_AUDIT",
                        issueType: issue.type,
                        severity: issue.severity,
                        status: "OPEN",
                        details: issue
                    }
                });
            }
        }

        return {
            totalChecked: entries.length,
            issuesFound: issues.length
        };
    }

    /**
     * Recover a tampered record using its lineage
     * Note: This assumes we have a valid RawRecord parent to re-normalize from
     */
    static async recoverRecord(tenantId: string, entryId: string) {
        const trace = await LineageService.traceBack(entryId);
        if (trace.length === 0) throw new Error("No lineage found for record recovery.");

        // In a real scenario, we'd find the most recent valid parent and re-process
        // For now, we delegate to the RepairService logic
        const { RepairService } = await import("./repair.service");
        return RepairService.repairLedgerEntry(tenantId, entryId);
    }
}
