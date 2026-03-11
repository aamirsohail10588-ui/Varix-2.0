/**
 * MODULE: Ingestion Controller
 * PATH: src/modules/ingestion/ingestion.controller.ts
 * VERSION: 2.1.0
 * STATUS: ACTIVE
 */

import { Request, Response } from "express";
import prisma from "../../infrastructure/prisma";
import {
    ingestionService,
    type ConnectorType,
    type SyncFrequency,
    type CreateConnectorInput,
} from "./ingestion.service";
import { ingestionQueue } from "../../infrastructure/queue";

export class IngestionController {

    async upload(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No file uploaded" });
                return;
            }

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            if (!tenantId) {
                res.status(400).json({ error: "Missing tenant ID" });
                return;
            }

            const fileName = req.file.originalname;
            let fileType: "CSV" | "EXCEL" | null = null;

            if (fileName.toLowerCase().endsWith(".csv")) {
                fileType = "CSV";
            } else if (
                fileName.toLowerCase().endsWith(".xlsx") ||
                fileName.toLowerCase().endsWith(".xls")
            ) {
                fileType = "EXCEL";
            }

            if (!fileType) {
                res.status(400).json({ error: "Unsupported file type. Use .csv, .xlsx, or .xls" });
                return;
            }

            const batch = await prisma.ingestionBatch.create({
                data: {
                    tenant_id: tenantId,
                    source_type: fileType,
                    file_name: fileName,
                    status: "pending",
                    files: {
                        create: {
                            file_path: req.file.path,
                            checksum: req.file.filename,
                        },
                    },
                },
            });

            await ingestionQueue.add("process-ingestion", {
                batchId: batch.id,
                tenantId,
                filePath: req.file.path,
                fileName,
                fileType,
            });

            res.status(202).json({
                message: "Upload received. Processing in background.",
                batchId: batch.id,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const batchId = req.params.batchId as string;
            const batch = await ingestionService.getBatchStatus(batchId);

            if (!batch) {
                res.status(404).json({ error: "Batch not found" });
                return;
            }

            res.json(batch);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId || req.headers["x-tenant-id"];
            const history = await ingestionService.getHistory(tenantId as string);
            res.json(history);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getRecent(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId || req.headers["x-tenant-id"];
            const limit = parseInt(req.query.limit as string || "10", 10);
            const recent = await ingestionService.getRecent(tenantId as string, limit);
            res.json(recent);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getConnectors(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const connectors = await ingestionService.getConnectors(tenantId);
            res.json({ success: true, connectors });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async createConnector(req: Request, res: Response): Promise<void> {
        try {
            const { type, config, frequency } = req.body as {
                type: ConnectorType;
                config: Record<string, unknown>;
                frequency?: SyncFrequency;
            };

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            if (!type || !config) {
                res.status(400).json({ error: "type and config are required" });
                return;
            }

            const input: CreateConnectorInput = {
                tenantId,
                type,
                config,
                frequency: frequency || "DAILY",
            };

            const connector = await ingestionService.createConnector(input);
            res.json({ success: true, connector });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async syncConnector(req: Request, res: Response): Promise<void> {
        try {
            const { connectorId } = req.body as { connectorId: string };

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            if (!connectorId) {
                res.status(400).json({ error: "connectorId is required" });
                return;
            }

            const result = await ingestionService.syncConnector(connectorId, tenantId);
            res.json(result);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getZohoAuth(req: Request, res: Response): Promise<void> {
        try {
            const { generateZohoAuthUrl } = await import("./zohobooks.service");

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const url = generateZohoAuthUrl(tenantId);
            res.json({ success: true, url });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async handleZohoCallback(req: Request, res: Response): Promise<void> {
        try {
            const { handleZohoCallback } = await import("./zohobooks.service");

            const { code, serverLocation } = req.body as {
                code: string;
                serverLocation?: string;
            };

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            if (!code) {
                res.status(400).json({ error: "OAuth code is required" });
                return;
            }

            const result = await handleZohoCallback(code, tenantId, serverLocation);
            res.json({ success: true, ...result });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }
}

export const ingestionController = new IngestionController();