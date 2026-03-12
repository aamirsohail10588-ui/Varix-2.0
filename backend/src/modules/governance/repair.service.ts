/**
 * SERVICE: Data Repair Pipeline
 * PATH: src/modules/governance/repair.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { ConditioningService } from "./conditioning.service";
import { OrchestrationService } from "../orchestration/orchestration.service";
import { LineageService } from "./lineage.service";
import { ConsolidationService } from "../ledger/consolidation.service";
import { GAAPComplianceService } from "../ledger/gaap.service";
import { PeriodService } from "../accounting/period.service";

export class RepairService {
    /**
     * Reprocess a specific record that has a conditioning log or low confidence
     */
    static async repairLedgerEntry(tenantId: string, ledgerEntryId: string) {
        const entry = await prisma.ledgerEntry.findUnique({
            where: { id: ledgerEntryId },
            include: { snapshot: true }
        });

        if (!entry) return;

        // Period Lock Check
        const isLocked = await PeriodService.isPeriodLocked(tenantId, entry.transaction_date);
        if (isLocked) {
            throw new Error(`Cannot repair entry ${ledgerEntryId}: The period is locked.`);
        }

        if (!entry.raw_record_id) return;

        const rawRecord = await prisma.rawRecord.findUnique({
            where: { id: entry.raw_record_id }
        });

        if (!rawRecord) return;

        // Re-run conditioning
        const result = await ConditioningService.conditionLedgerEntry(
            tenantId,
            rawRecord.payload_json,
            entry.source_system || "REPAIR_PIPELINE"
        );

        // GAAP Validation
        const gaapErrors = GAAPComplianceService.validateEntry(result.finalValue);
        if (gaapErrors.length > 0) {
            result.fixes.push(...gaapErrors.map(e => `GAAP_WARN_${e}`));
        }

        // Multi-Currency Consolidation
        const baseAmount = await ConsolidationService.convertToBaseCurrency(
            tenantId,
            parseFloat(result.finalValue.debit_amount) - parseFloat(result.finalValue.credit_amount),
            result.finalValue.currency,
            result.finalValue.transaction_date || new Date()
        );

        const repairedEntryData = {
            account_id: result.finalValue.account_id,
            debit_amount: result.finalValue.debit_amount,
            credit_amount: result.finalValue.credit_amount,
            currency: result.finalValue.currency,
            base_currency_amount: baseAmount,
            confidence_score: result.confidenceScore
        };

        const provenanceHash = LineageService.generateHash({ ...entry, ...repairedEntryData, provenance_hash: undefined });

        // Update the entry with repaired data
        await (prisma.ledgerEntry as any).update({
            where: { id: ledgerEntryId },
            data: {
                ...repairedEntryData,
                provenance_hash: provenanceHash
            }
        });

        // Record lineage trail for the repair
        await LineageService.recordTrail(
            tenantId,
            "LedgerEntry",
            ledgerEntryId,
            "LedgerEntry",
            ledgerEntryId,
            "REPAIR"
        );

        // Log the repair
        await ConditioningService.logConditioning(
            tenantId,
            "LedgerEntry",
            ledgerEntryId,
            rawRecord.payload_json,
            ["MANUAL_REPAIR_TRIGGERED", ...result.fixes],
            result.confidenceScore - (entry.confidence_score || 0)
        );
    }

    /**
     * Reprocess all legacy/low-confidence records for a tenant
     * This can be triggered as a background workflow task
     */
    static async bulkRepair(tenantId: string, minConfidence: number = 70) {
        const entries = await prisma.ledgerEntry.findMany({
            where: {
                tenant_id: tenantId,
                confidence_score: { lt: minConfidence }
            },
            take: 1000 // Process in batches
        });

        for (const entry of entries) {
            await this.repairLedgerEntry(tenantId, entry.id);
        }

        return entries.length;
    }

    /**
     * Trigger a repair workflow via Orchestration
     */
    static async triggerRepairWorkflow(tenantId: string, minConfidence: number = 70) {
        const run = await OrchestrationService.startWorkflow(tenantId, "DATA_REPAIR_PIPELINE", { minConfidence });

        await OrchestrationService.addTask(
            run.id,
            "BULK_REPAIR_TASK",
            "condition", // Handled by orchestration worker with specific logic
            { minConfidence }
        );

        return run;
    }
}
