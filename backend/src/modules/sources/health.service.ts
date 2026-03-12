/**
 * SERVICE: Source Reliability & Health Monitoring
 * PATH: src/modules/sources/health.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { ConnectorHealth, ConnectorStatus } from "./connector.interface";

export class HealthService {
    /**
     * Get aggregate health for all connectors of a tenant
     */
    static async getTenantSourceHealth(tenantId: string) {
        const connectors = await prisma.erpConnector.findMany({
            where: { tenant_id: tenantId }
        });

        return connectors.map(conn => {
            const config = (conn.connection_config as any) || {};
            const metrics = config.metrics || {
                success_rate: 1.0,
                average_latency_ms: 0,
                reliability_score: 100
            };

            return {
                connectorId: conn.id,
                connectorType: conn.connector_type,
                status: conn.status as ConnectorStatus,
                lastSync: conn.last_sync_at,
                ...metrics
            };
        });
    }

    /**
     * Update reliability score manually or via background process
     */
    static async updateReliabilityScore(connectorId: string, score: number) {
        const connector = await prisma.erpConnector.findUnique({
            where: { id: connectorId }
        });

        if (!connector) throw new Error("Connector not found");

        const config = (connector.connection_config as any) || {};
        config.metrics = {
            ...(config.metrics || {}),
            reliability_score: score
        };

        await prisma.erpConnector.update({
            where: { id: connectorId },
            data: { connection_config: config }
        });
    }
}
