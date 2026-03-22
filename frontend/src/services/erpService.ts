import apiClient from "./apiClient";

export interface ERPConnector {
    id: string;
    connector_type: string;
    status: string;
    last_sync_at?: string;
    sync_frequency: string;
}

export const erpService = {
    async getConnectors(): Promise<ERPConnector[]> {
        const response = await apiClient.get("/ingestion/connectors/status");
        return response.data.connectors || [];
    },

    async createConnector(data: any) {
        return apiClient.post("/ingestion/connectors/create", data);
    },

    async syncConnector(connectorId: string) {
        return apiClient.post("/ingestion/connectors/sync", { connectorId });
    },

    async triggerSync(connectorId: string) {
        return this.syncConnector(connectorId);
    }
};
