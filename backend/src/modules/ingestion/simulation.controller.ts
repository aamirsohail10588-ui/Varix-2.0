/**
 * MODULE: Simulation Controller
 * PATH: src/modules/ingestion/simulation.controller.ts
 * VERSION: 1.0.0
 * STATUS: ACTIVE
 *
 * Handles test dataset imports via the TestImportModal.
 * Delegates to processSimulationImport in simulation.service.ts
 */

import { Request, Response } from "express";
import { processSimulationImport } from "../../services/simulation.service";

export class SimulationController {

    async importTestDataset(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No file uploaded." });
                return;
            }

            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const userId = (
                req as Request & { user?: { userId: string } }
            ).user?.userId as string;

            const {
                sourceSystem = "CUSTOM",
                entity = "Global",
                period = "2026-03",
            } = req.body as {
                sourceSystem?: string;
                entity?: string;
                period?: string;
            };

            const result = await processSimulationImport(req.file.path, {
                sourceSystem,
                entity,
                period,
                tenantId,
                userId,
            });

            res.status(202).json({
                success: true,
                message: "Simulation import queued successfully.",
                ...result,
            });
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Simulation import failed.";
            console.error("[SimulationController] Import failed:", message);
            res.status(500).json({ error: message });
        }
    }
}

export const simulationController = new SimulationController();