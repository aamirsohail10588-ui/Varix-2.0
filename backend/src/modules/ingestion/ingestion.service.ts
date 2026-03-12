/**
 * MODULE: Ingestion Service
 * PATH: src/modules/ingestion/ingestion.service.ts
 * VERSION: 2.1.0
 * STATUS: ACTIVE
 *
 * Responsibilities:
 * - CSV / Excel file ingestion
 * - Connector CRUD
 * - Batch orchestration
 * - Snapshot creation for normalization worker
 *
 * OUT OF SCOPE:
 * - Zoho OAuth / sync → zohobooks.service.ts
 * - Normalization logic → normalization.worker.ts (to be built)
 * - Canonical mapping → canonical.mapper.ts (to be built)
 */

import fs from "fs";
import * as xlsx from "xlsx";
import prisma from "../../infrastructure/prisma";
import { csvIngestionPipeline } from "../../pipelines/csvIngestion.pipeline";
import type { Prisma } from "@prisma/client";
import { ValidationService } from "./validation.service";
import { DLQService } from "./dlq.service";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ConnectorType =
    | "ZOHO_CONNECTOR"
    | "TALLY_CONNECTOR"
    | "SAP_CONNECTOR"
    | "QUICKBOOKS_CONNECTOR"
    | "CUSTOM_CONNECTOR";

export type SyncFrequency =
    | "EVERY_1_HOUR"
    | "EVERY_6_HOURS"
    | "EVERY_12_HOURS"
    | "DAILY"
    | "MANUAL";

export type BatchStatus =
    | "RECEIVED"
    | "VALIDATING"
    | "STAGED"
    | "NORMALIZED"
    | "COMMITTED"
    | "FAILED";

export interface ConnectorConfig {
    access_token?: string;
    refresh_token?: string;
    token_expiry?: number;
    organization_id?: string;
    server_location?: string;
    api_key?: string;
    base_url?: string;
    [key: string]: unknown;
}

export interface CreateConnectorInput {
    tenantId: string;
    type: ConnectorType;
    config: ConnectorConfig;
    frequency: SyncFrequency;
}

export interface RawPayloadRow {
    transaction_date: string;
    account_code: string;
    account_name?: string;
    amount: string;
    currency?: string;
    voucher_number?: string;
    vendor_id?: string;
    invoice_number?: string;
    description?: string;
    source_system: string;
    debit: string;
    credit: string;
}

export interface IngestionResult {
    success: boolean;
    batchId: string;
    recordCount: number;
    snapshotId?: string;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

export class IngestionService {

    // ── CSV ──────────────────────────────────────

    async processCsv(
        filePath: string,
        tenantId: string,
        batchId: string
    ): Promise<IngestionResult> {
        try {
            const result = await csvIngestionPipeline.processExtremeScale(
                filePath,
                tenantId,
                batchId
            );
            return result as IngestionResult;
        } catch (error) {
            await this.markBatchFailed(batchId, error);
            throw error;
        } finally {
            this.safeDeleteFile(filePath);
        }
    }

    // ── EXCEL ─────────────────────────────────────

    async processExcel(
        filePath: string,
        tenantId: string,
        batchId: string
    ): Promise<IngestionResult> {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];

            if (!sheetName) {
                throw new Error("Excel file contains no sheets.");
            }

            const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
                workbook.Sheets[sheetName]
            );

            if (rows.length === 0) {
                throw new Error("Excel sheet is empty.");
            }

            await this.transitionState(batchId, "VALIDATING");

            const validationResult = ValidationService.validateRawRecords(rows as unknown as RawPayloadRow[]);

            if (!validationResult.isValid) {
                // Log issues but proceed if possible, or move specifically failed to DLQ
                // For this protocol, we'll staged them as FAILED if any critical schema issue
                await this.markBatchFailed(batchId, new Error(`Schema validation failed: ${validationResult.errors[0]}`));
                return { success: false, batchId, recordCount: rows.length };
            }

            await this.transitionState(batchId, "STAGED");

            await prisma.rawRecord.createMany({
                data: rows.map((row) => ({
                    batch_id: batchId,
                    payload_json: row as Prisma.InputJsonValue,
                })),
            });

            await prisma.ingestionBatch.update({
                where: { id: batchId },
                data: {
                    record_count: rows.length,
                },
            });

            await this.transitionState(batchId, "NORMALIZED");

            const snapshotId = await this.normalizeToLedgerEntries(tenantId, batchId);

            await this.transitionState(batchId, "COMMITTED");

            return {
                success: true,
                batchId,
                recordCount: rows.length,
                snapshotId,
            };
        } catch (error) {
            await this.markBatchFailed(batchId, error);
            throw error;
        } finally {
            this.safeDeleteFile(filePath);
        }
    }

    // ── NORMALIZATION HANDOFF ─────────────────────

    async normalizeToLedgerEntries(
        tenantId: string,
        batchId: string
    ): Promise<string> {
        // STEP 2: Short transaction for snapshot metadata
        const snapshot = await prisma.$transaction(async (tx) => {
            return await tx.snapshot.create({
                data: {
                    tenant_id: tenantId,
                    batch_id: batchId,
                    status: "UNPROCESSED",
                    snapshot_timestamp: new Date(),
                },
            });
        }, {
            timeout: 60000 // STEP 6: Increased timeout
        });

        // STEP 3: Raw record linking is now handled atomically during the initial load in the pipeline.
        console.log(`[IngestionService] Batch ${batchId} linked to snapshot ${snapshot.id} in pipeline.`);

        console.log(
            `[IngestionService] Snapshot ${snapshot.id} finalized for batch ${batchId}.`
        );

        return snapshot.id;
    }

    // ── CONNECTOR CRUD ────────────────────────────

    async createConnector(input: CreateConnectorInput) {
        const { tenantId, type, config, frequency } = input;

        return prisma.erpConnector.upsert({
            where: {
                tenant_id_connector_type: {
                    tenant_id: tenantId,
                    connector_type: type,
                },
            },
            update: {
                connection_config: config as Prisma.InputJsonValue,
                sync_frequency: frequency,
                status: "ACTIVE",
            },
            create: {
                tenant_id: tenantId,
                connector_type: type,
                connection_config: config as Prisma.InputJsonValue,
                sync_frequency: frequency,
                status: "ACTIVE",
            },
        });
    }

    async getConnectors(tenantId: string) {
        return prisma.erpConnector.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: "desc" },
        });
    }

    async getConnectorById(connectorId: string, tenantId: string) {
        const connector = await prisma.erpConnector.findUnique({
            where: { id: connectorId },
        });

        if (!connector || connector.tenant_id !== tenantId) {
            throw new Error(
                `Connector ${connectorId} not found for tenant ${tenantId}.`
            );
        }

        return connector;
    }

    // ── BATCH ─────────────────────────────────────

    async createBatch(
        tenantId: string,
        sourceType: ConnectorType,
        fileName: string,
        recordCount: number
    ) {
        return prisma.ingestionBatch.create({
            data: {
                tenant_id: tenantId,
                source_type: sourceType,
                file_name: fileName,
                record_count: recordCount,
                status: "processing",
            },
        });
    }

    async getBatchStatus(batchId: string) {
        return prisma.ingestionBatch.findUnique({
            where: { id: batchId },
        });
    }

    async getHistory(tenantId: string) {
        return prisma.snapshot.findMany({
            where: { tenant_id: tenantId },
            include: {
                batch: true
            },
            orderBy: { snapshot_timestamp: "desc" }
        });
    }

    async getRecent(tenantId: string, limit: number = 10) {
        return prisma.snapshot.findMany({
            where: { tenant_id: tenantId },
            include: {
                batch: true
            },
            orderBy: { snapshot_timestamp: "desc" },
            take: limit
        });
    }

    async insertRawRecords(
        batchId: string,
        payloads: RawPayloadRow[],
        chunkSize = 5000
    ): Promise<void> {
        const data = payloads.map((row) => ({
            batch_id: batchId,
            payload_json: row as unknown as Prisma.InputJsonValue,
        }));

        for (let i = 0; i < data.length; i += chunkSize) {
            await prisma.rawRecord.createMany({
                data: data.slice(i, i + chunkSize),
            });
        }
    }

    // ── SYNC DISPATCHER ───────────────────────────

    async syncConnector(
        connectorId: string,
        tenantId: string
    ): Promise<{ success: boolean; records_synced: number }> {
        const connector = await this.getConnectorById(connectorId, tenantId);

        if (connector.status !== "ACTIVE") {
            throw new Error(
                `Cannot sync connector in ${connector.status} status.`
            );
        }

        switch (connector.connector_type as ConnectorType) {
            case "ZOHO_CONNECTOR": {
                const { syncZohoBooks } = await import("./zohobooks.service");
                return syncZohoBooks(connectorId, tenantId);
            }
            case "TALLY_CONNECTOR":
                throw new Error("Tally connector not yet implemented.");
            case "SAP_CONNECTOR":
                throw new Error("SAP connector not yet implemented.");
            case "QUICKBOOKS_CONNECTOR":
                throw new Error("QuickBooks connector not yet implemented.");
            default:
                throw new Error(
                    `Unknown connector type: ${connector.connector_type}`
                );
        }
    }

    // ── PRIVATE UTILITIES ─────────────────────────

    async transitionState(
        batchId: string,
        nextStatus: BatchStatus,
        details?: any
    ): Promise<void> {
        await prisma.ingestionBatch.update({
            where: { id: batchId },
            data: { status: nextStatus },
        });

        await prisma.auditLog.create({
            data: {
                action: "BATCH_STATE_TRANSITION",
                entityType: "IngestionBatch",
                entityId: batchId,
                details: { nextStatus, ...details },
            },
        });
    }

    private async markBatchFailed(
        batchId: string,
        error: unknown
    ): Promise<void> {
        const message =
            error instanceof Error ? error.message : "Unknown error";

        await this.transitionState(batchId, "FAILED", { error: message });
    }

    private safeDeleteFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(
                `[IngestionService] Could not delete temp file ${filePath}:`,
                error
            );
        }
    }
}

export const ingestionService = new IngestionService()