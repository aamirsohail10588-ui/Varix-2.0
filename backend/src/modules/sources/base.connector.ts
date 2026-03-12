/**
 * ABSTRACT: Base Connector with Reliability & Retry Logic
 * PATH: src/modules/sources/base.connector.ts
 */

import {
    IConnector,
    SyncResult,
    ConnectorHealth,
    RetryConfig,
    DEFAULT_RETRY_CONFIG,
    ConnectorStatus
} from "./connector.interface";
import { logAuditAction } from "../../services/audit.service";
import prisma from "../../infrastructure/prisma";

export abstract class BaseConnector implements IConnector {
    abstract readonly connectorType: string;

    constructor(
        public readonly tenantId: string,
        public readonly connectorId: string,
        protected readonly retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
    ) { }

    abstract validateConnection(): Promise<boolean>;

    /**
     * Implementation-specific sync logic to be defined by subclasses
     */
    protected abstract executeSync(): Promise<SyncResult>;

    /**
     * Wrapped sync with retry, logging, and metrics
     */
    async sync(): Promise<SyncResult> {
        let attempt = 0;
        let lastError: Error | null = null;
        const startTime = Date.now();

        while (attempt < this.retryConfig.maxRetries) {
            try {
                const result = await this.executeSync();
                const latency = Date.now() - startTime;

                await this.recordMetrics(true, latency, result.records_synced);
                await this.logSyncEvent("SYNC_SUCCESS", { attempt, latency, ...result });

                return result;
            } catch (error) {
                attempt++;
                lastError = error as Error;
                const delay = Math.min(
                    this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
                    this.retryConfig.maxDelayMs
                );

                console.error(`[${this.connectorType}] Sync attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`);

                if (attempt < this.retryConfig.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        const finalLatency = Date.now() - startTime;
        await this.recordMetrics(false, finalLatency, 0);
        await this.logSyncEvent("SYNC_FAILURE", {
            attempts: attempt,
            latency: finalLatency,
            error: lastError?.message
        });

        return {
            success: false,
            records_synced: 0,
            timestamp: new Date(),
            error: lastError?.message || "Max retries exceeded"
        };
    }

    async getHealth(): Promise<ConnectorHealth> {
        const connector = await prisma.erpConnector.findUnique({
            where: { id: this.connectorId },
            select: {
                last_sync_at: true,
                status: true,
                connection_config: true
            }
        });

        // Metrics are derived from the connection_config or a separate metrics table
        // For Layer 1, we'll store simplified reliability data in connection_config
        const config = (connector?.connection_config as any) || {};
        const metrics = config.metrics || {
            success_rate: 1.0,
            average_latency_ms: 0,
            error_count_recent: 0
        };

        return {
            last_sync_at: connector?.last_sync_at || undefined,
            status: (connector?.status as ConnectorStatus) || "INACTIVE",
            ...metrics
        };
    }

    protected async recordMetrics(success: boolean, latency: number, count: number): Promise<void> {
        const connector = await prisma.erpConnector.findUnique({
            where: { id: this.connectorId }
        });

        if (!connector) return;

        const config = (connector.connection_config as any) || {};
        const oldMetrics = config.metrics || { success_rate: 1.0, average_latency_ms: 0, total_syncs: 0, error_count_recent: 0 };

        const totalSyncs = (oldMetrics.total_syncs || 0) + 1;
        const newSuccessRate = ((oldMetrics.success_rate * (totalSyncs - 1)) + (success ? 1 : 0)) / totalSyncs;
        const newLatency = ((oldMetrics.average_latency_ms * (totalSyncs - 1)) + latency) / totalSyncs;

        const updatedConfig = {
            ...config,
            metrics: {
                success_rate: Number(newSuccessRate.toFixed(4)),
                average_latency_ms: Math.round(newLatency),
                total_syncs: totalSyncs,
                error_count_recent: success ? 0 : (oldMetrics.error_count_recent || 0) + 1,
                reliability_score: Number((newSuccessRate * 100).toFixed(2)) // 0-100 scale
            }
        };

        await prisma.erpConnector.update({
            where: { id: this.connectorId },
            data: {
                connection_config: updatedConfig,
                status: success ? "ACTIVE" : (updatedConfig.metrics.error_count_recent > 3 ? "ERROR" : "ACTIVE")
            }
        });
    }

    protected async logSyncEvent(action: string, details: any): Promise<void> {
        await logAuditAction(
            action,
            "ErpConnector",
            this.connectorId,
            details,
            "SYSTEM",
            this.tenantId
        );
    }
}
