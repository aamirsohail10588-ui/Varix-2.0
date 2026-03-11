/**
 * MODULE: Simulation Service
 * PATH: src/services/simulation.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 *
 * NOTE: startIngestionPipeline does not exist in ingestion.service.
 * Replaced with ingestionService.normalizeToLedgerEntries which is
 * the correct method to hand off a batch to the normalization worker.
 */
import prisma from "../infrastructure/prisma";
import { ingestionService } from "../modules/ingestion/ingestion.service";
import { logAuditAction } from "./audit.service";
import type { Prisma } from "@prisma/client";

export interface SimulationMetadata {
    sourceSystem: string;
    entity: string;
    period: string;
    tenantId: string;
    userId: string;
}

const REQUIRED_COLUMNS = [
    "transaction_id",
    "transaction_date",
    "entity",
    "account_code",
    "account_name",
    "debit",
    "credit",
    "currency",
];

export const processSimulationImport = async (
    filePath: string,
    metadata: SimulationMetadata
): Promise<{ batchId: string; snapshotId: string; recordCount: number }> => {

    const { tenantId, sourceSystem, userId } = metadata;

    const batch = await prisma.ingestionBatch.create({
        data: {
            tenant_id: tenantId,
            source_type: `SIMULATION_${sourceSystem.toUpperCase()}`,
            file_name: `simulation_${Date.now()}.csv`,
            status: "processing",
            record_count: 0,
            createdBy: userId,
        },
    });

    const result = await ingestionService.processCsv(
        filePath,
        tenantId,
        batch.id
    );

    await logAuditAction(
        "SIMULATION_IMPORT",
        "IngestionBatch",
        batch.id,
        {
            sourceSystem,
            snapshotId: result.snapshotId,
        },
        userId,
        tenantId
    );

    return {
        batchId: batch.id,
        snapshotId: result.snapshotId!,
        recordCount: result.recordCount,
    };
};