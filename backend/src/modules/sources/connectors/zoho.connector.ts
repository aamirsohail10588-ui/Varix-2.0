/**
 * CONNECTOR: Zoho Books Implementation
 * PATH: src/modules/sources/connectors/zoho.connector.ts
 */

import { BaseConnector } from "../base.connector";
import { SyncResult } from "../connector.interface";
import { syncZohoBooks } from "../../ingestion/zohobooks.service";
import prisma from "../../../infrastructure/prisma";

export class ZohoConnector extends BaseConnector {
    readonly connectorType = "ZOHO_CONNECTOR";

    /**
     * Zoho-specific connection validation
     */
    async validateConnection(): Promise<boolean> {
        try {
            const connector = await prisma.erpConnector.findUnique({
                where: { id: this.connectorId }
            });

            if (!connector || connector.status !== "ACTIVE") {
                return false;
            }

            // Simple token check or cheap API call could go here
            const config = connector.connection_config as any;
            return !!(config.refresh_token && config.organization_id);
        } catch (error) {
            console.error(`[ZohoConnector] Validation failed:`, error);
            return false;
        }
    }

    /**
     * Executes the sync by delegating to the existing service logic
     * but wrapped in our new BaseConnector framework for retries and metrics.
     */
    protected async executeSync(): Promise<SyncResult> {
        // We reuse the existing syncZohoBooks but can eventually refactor it fully into this class
        const result = await syncZohoBooks(this.connectorId, this.tenantId);

        return {
            success: result.success,
            records_synced: result.records_synced,
            timestamp: result.timestamp
        };
    }
}
