import { Request, Response } from "express";
import { monitoringService } from "./monitoring.service";

export class SystemController {
    async getWorkerHealth(req: Request, res: Response): Promise<any> {
        try {
            const [queueDepths, partitionHealth] = await Promise.all([
                monitoringService.getQueueDepths(),
                monitoringService.checkPartitionHealth()
            ]);

            const metrics = monitoringService.getMetrics();
            const healthReport = monitoringService.getHealthReport();

            return res.json({
                status: queueDepths.total > 100 ? "DEGRADED" : "HEALTHY",
                timestamp: new Date(),
                queues: queueDepths,
                partitions: partitionHealth,
                integrity: healthReport.integrity,
                consistency: healthReport.consistency,
                performance: metrics.averages,
                raw_metrics: metrics
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export const systemController = new SystemController();
