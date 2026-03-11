/**
 * MODULE: Sync Service
 * PATH: src/services/sync.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 *
 * Responsibilities:
 * - Trigger and track ERP sync jobs
 * - Dispatch to connector-specific sync implementations
 * - Log sync results and audit trail
 *
 * OUT OF SCOPE:
 * - Zoho sync logic → src/modules/ingestion/zohobooks.service.ts
 * - SAP sync logic → to be built
 */

import prisma from "../infrastructure/prisma"
import { logAuditAction } from "./audit.service";
import type { ErpConnector } from "@prisma/client";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SyncResult {
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: string[];
}

type SyncMode = "FULL" | "DELTA";

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export class SyncService {

    async triggerSync(
        tenantId: string,
        connectorId: string,
        syncMode: SyncMode = "DELTA"
    ): Promise<SyncResult> {
        const connector = await prisma.erpConnector.findUnique({
            where: { id: connectorId },
            include: { tokens: true },
        });

        if (!connector || connector.tenant_id !== tenantId) {
            throw new Error("Connector not found.");
        }

        // Create sync job — schema uses snake_case: tenant_id, connector_id
        const job = await prisma.syncJob.create({
            data: {
                tenant_id: tenantId,
                connector_id: connectorId,
                sync_type: syncMode,
                status: "PENDING",
            },
        });

        try {
            // Mark as running — schema uses snake_case: started_at
            await prisma.syncJob.update({
                where: { id: job.id },
                data: {
                    status: "RUNNING",
                    started_at: new Date(),
                },
            });

            // Dispatch to connector-specific implementation
            let result: SyncResult;

            if (connector.connector_type === "SAP_CONNECTOR") {
                result = await this.performSapSync(connector);
            } else if (connector.connector_type === "ZOHO_CONNECTOR") {
                result = await this.performZohoSync(connector);
            } else {
                throw new Error(
                    `Sync not implemented for connector type: ${connector.connector_type}`
                );
            }

            // Complete job — schema uses snake_case: completed_at
            // record_count is the only numeric field in schema — no stats/result JSON field
            await prisma.syncJob.update({
                where: { id: job.id },
                data: {
                    status: "COMPLETED",
                    completed_at: new Date(),
                    record_count: result.recordsProcessed,
                },
            });

            // Update connector last sync timestamp
            await prisma.erpConnector.update({
                where: { id: connectorId },
                data: { last_sync_at: new Date() },
            });

            // Write success log — schema uses snake_case: job_id
            await prisma.syncLog.create({
                data: {
                    job_id: job.id,
                    level: "INFO",
                    message: `Sync completed. Processed: ${result.recordsProcessed}, Inserted: ${result.recordsInserted}, Updated: ${result.recordsUpdated}`,
                },
            });

            await logAuditAction(
                "SYNC_COMPLETED",
                "ErpConnector",
                connectorId,
                { syncMode, result },
                "SYSTEM",
                tenantId
            );

            return result;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Unknown sync error";
            const stack =
                error instanceof Error ? (error.stack ?? "") : "";

            // Mark job as failed — schema uses snake_case: completed_at
            await prisma.syncJob.update({
                where: { id: job.id },
                data: {
                    status: "FAILED",
                    completed_at: new Date(),
                    error_message: message,
                },
            });

            // Write error log — schema uses snake_case: job_id
            // SyncLog has no 'details' field in schema — message carries full context
            await prisma.syncLog.create({
                data: {
                    job_id: job.id,
                    level: "ERROR",
                    message: `${message} | Stack: ${stack}`,
                },
            });

            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // CONNECTOR IMPLEMENTATIONS
    // ─────────────────────────────────────────────

    private async performSapSync(
        _connector: ErpConnector
    ): Promise<SyncResult> {
        // TODO: Implement SAP OData client
        // Module: src/modules/ingestion/sap.service.ts (to be built)
        return {
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: [],
        };
    }

    private async performZohoSync(
        connector: ErpConnector
    ): Promise<SyncResult> {
        // Delegate to zohobooks.service.ts — single source of truth for Zoho sync
        const { syncZohoBooks } = await import(
            "../modules/ingestion/zohobooks.service"
        );

        const result = await syncZohoBooks(connector.id, connector.tenant_id);

        return {
            recordsProcessed: result.records_synced,
            recordsInserted: result.records_synced,
            recordsUpdated: 0,
            errors: [],
        };
    }
}

export const syncService = new SyncService();