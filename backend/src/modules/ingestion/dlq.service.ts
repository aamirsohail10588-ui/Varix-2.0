/**
 * SERVICE: Dead Letter Queue (DLQ) for Ingestion Failures
 * PATH: src/modules/ingestion/dlq.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { RawPayloadRow } from "./ingestion.service";
import { Prisma } from "@prisma/client";

export class DLQService {
    /**
     * Move failed records to DLQ for manual intervention
     */
    static async moveToDLQ(
        tenantId: string,
        batchId: string,
        failedRecords: RawPayloadRow[],
        reason: string
    ) {
        // We use the raw_records table with a specific flag or a dedicated DLQ table.
        // In the current schema, we'll leverage validationErrors and a specific batch status.

        console.warn(`[DLQService] Moving ${failedRecords.length} records to DLQ for batch ${batchId}. Reason: ${reason}`);

        for (const record of failedRecords) {
            await prisma.rawRecord.create({
                data: {
                    batch_id: batchId,
                    payload_json: record as any,
                    validationErrors: { dlq_reason: reason }
                }
            });
        }

        await prisma.auditLog.create({
            data: {
                tenantId,
                action: "INGESTION_DLQ_MOVE",
                entityType: "IngestionBatch",
                entityId: batchId,
                details: {
                    recordCount: failedRecords.length,
                    reason
                }
            }
        });
    }

    /**
     * Get DLQ statistics for a tenant
     */
    static async getDLQStats(tenantId: string) {
        const failedBatches = await prisma.ingestionBatch.count({
            where: {
                tenant_id: tenantId,
                status: "FAILED"
            }
        });

        // Sum of raw records with validation errors
        const dlqRecords = await prisma.rawRecord.count({
            where: {
                batch: { tenant_id: tenantId },
                NOT: { validationErrors: { equals: Prisma.AnyNull } }
            }
        });

        return {
            failedBatches,
            dlqRecords
        };
    }
}
