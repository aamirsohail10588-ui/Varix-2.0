import { Request, Response } from "express";
import { analyticsService } from "./analytics.service";
import prisma from "../../infrastructure/prisma";
import { AuthRequest } from "../../middleware/auth.middleware";

export class AnalyticsController {
    async getRiskVectors(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            let period = (req.query.period as string) || "2026";

            if (!period.includes("Q")) {
                period = `${period}-Q1`;
            }
            const metrics = await analyticsService.getRiskVectors(tenantId, period);
            return res.json(metrics);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async calculateRisk(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            const period = req.params.period as string;
            const result = await analyticsService.calculatePeriodRisk(tenantId, period);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getIntegrityScore(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            const result = await analyticsService.calculateIntegrityScore(tenantId);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getDashboardSummary(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            const [violations, closeProgress, volume] = await Promise.all([
                analyticsService.getControlViolations(tenantId),
                analyticsService.getCloseProgress(tenantId),
                analyticsService.getLedgerVolume(tenantId)
            ]);
            return res.json({
                violations,
                closeProgress,
                volume
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getFinancialHealth(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            let period = (req.query.period as string) || "2026";

            if (!period.includes("Q")) {
                period = `${period}-Q1`;
            }
            const health = await analyticsService.calculateFHI(tenantId, period);
            return res.json(health);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getBenchmarks(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = (req as any).tenantId as string;
            const benchmarks = await analyticsService.getTenantBenchmarks(tenantId);
            return res.json({ success: true, benchmarks });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getFinancialState(req: Request, res: Response): Promise<any> {
        try {
            const nodeId = String(req.params.nodeId);
            const tenantId = (req as any).tenantId as string;

            const node = await prisma.graphNode.findUnique({
                where: { id: nodeId }
            });

            if (!node || node.tenant_id !== tenantId) {
                return res.status(404).json({ error: "Financial state node not found" });
            }

            return res.json({
                nodeId: node.id,
                type: node.node_type,
                state: node.state_value,
                version: node.version,
                lastComputedAt: node.last_computed_at
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export const analyticsController = new AnalyticsController();
