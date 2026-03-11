import apiClient from "./apiClient";

export interface ERPConnector {
    id: string;
    type: "ZOHO" | "TALLY" | "SAP";
    status: "CONNECTED" | "DISCONNECTED" | "SYNCING" | "ERROR";
    last_sync?: string;
}

export const erpService = {
    async getConnectors(): Promise<ERPConnector[]> {
        const response = await apiClient.get("/ingestion/connectors/status");
        return response.data;
    },

    async createConnector(data: any) {
        return apiClient.post("/ingestion/connectors/create", data);
    },

    async syncConnector(connectorId: string) {
        return apiClient.post("/ingestion/connectors/sync", { connectorId });
    }
};
