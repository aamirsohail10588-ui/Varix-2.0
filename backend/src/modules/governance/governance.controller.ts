/**
 * MODULE: Governance Controller
 * PATH: src/modules/governance/governance.controller.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import { Request, Response } from "express";
import prisma from "../../infrastructure/prisma";
import { governanceService } from "./governance.service";
import { ExportService, ExportFormat } from "../../services/export.service";

export class GovernanceController {

    async getCurrentCycle(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const cycle = await prisma.closeCycle.findFirst({
                where: { tenantId, status: "OPEN" },
                include: {
                    tasks: {
                        include: {
                            dependenciesAsSuccessor: true,
                            approvals: true,
                            evidence: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            res.json({ cycle });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async startCycle(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body as { name?: string };
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const date = new Date();
            const endDate = new Date(date);
            endDate.setDate(date.getDate() + 7);

            const cycle = await governanceService.createCycle(
                tenantId,
                name || `Month-End ${date.getMonth()}`,
                date,
                endDate
            );

            await governanceService.createCloseTask(tenantId, cycle.id, "Bank Reconciliation");
            await governanceService.createCloseTask(tenantId, cycle.id, "Tax Validation");

            res.status(201).json(cycle);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getViolations(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const page = parseInt((req.query.page as string) || "1");
            const limit = parseInt((req.query.limit as string) || "50");

            const skip = (page - 1) * limit;

            const violations = await prisma.controlResult.findMany({
                where: { controlRun: { tenantId } },
                skip,
                take: limit,
                include: { controlSpec: true, controlRun: true },
                orderBy: { created_at: "desc" },
            });

            const total = await prisma.controlResult.count({
                where: { controlRun: { tenantId } },
            });

            res.json({
                page,
                limit,
                total,
                violations
            });

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async exportViolations(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const format = (
                ((req.query.format as string) || "CSV").toUpperCase()
            ) as ExportFormat;

            const violations = await prisma.controlResult.findMany({
                where: { controlRun: { tenantId } },
                include: { controlSpec: true },
            });

            const headers = ["ID", "Control", "Severity", "Message"];
            const data = violations.map((v) => [
                v.id,
                v.controlSpec.name,
                v.severity,
                v.violation_message,
            ]);

            const buffer = await ExportService.generateExport({
                title: "Governance Violations",
                headers,
                data,
                format,
            });

            res.setHeader(
                "Content-Type",
                format === "CSV" ? "text/csv" : "application/pdf"
            );
            res.send(buffer);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async getSnapshots(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (
                (req as Request & { tenantId?: string }).tenantId ||
                req.headers["x-tenant-id"]
            ) as string;

            const snapshots = await governanceService.getVerifiedSnapshots(tenantId);
            res.json({ snapshots });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }

    async approveTask(req: Request, res: Response): Promise<void> {
        try {
            const { status, comments } = req.body as {
                status: "APPROVED" | "REJECTED";
                comments?: string;
            };

            const userId = (req as Request & { user?: { userId: string } }).user
                ?.userId as string;

            // req.params.taskId is string | string[] in Express types
            // cast to string explicitly
            const taskId = String(req.params.taskId);

            const result = await governanceService.approveTask(
                taskId,
                userId,
                status,
                comments
            );

            res.json(result);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({ error: message });
        }
    }
}

export const governanceController = new GovernanceController();