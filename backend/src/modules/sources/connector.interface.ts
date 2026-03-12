/**
 * INTERFACE: Connector Standard Definition
 * PATH: src/modules/sources/connector.interface.ts
 */

export type ConnectorStatus = "ACTIVE" | "INACTIVE" | "ERROR" | "MAINTENANCE";

export interface SyncResult {
    success: boolean;
    records_synced: number;
    timestamp: Date;
    error?: string;
}

export interface ConnectorHealth {
    last_sync_at?: Date;
    success_rate: number; // 0.0 - 1.0
    average_latency_ms: number;
    error_count_recent: number;
    status: ConnectorStatus;
}

export interface IConnector {
    readonly connectorType: string;
    readonly tenantId: string;
    readonly connectorId: string;

    /**
     * Authenticate and check connectivity
     */
    validateConnection(): Promise<boolean>;

    /**
     * Primary sync execution method
     */
    sync(): Promise<SyncResult>;

    /**
     * Health check for internal monitoring
     */
    getHealth(): Promise<ConnectorHealth>;
}

export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2,
};
