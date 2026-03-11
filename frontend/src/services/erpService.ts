import api from "@/lib/api";

export interface ERPConnector {
    id: string;
    name: string;
    connector_type: string; // Match backend naming
    status: "active" | "inactive" | "error";
    last_sync_at: string;
    rows_processed: number;
    sync_frequency: string;
}

export const erpService = {
    async getConnectors(): Promise<ERPConnector[]> {
        const response = await api.get("/ingestion/connectors/status");
        return response.data.connectors || [];
    },

    async triggerSync(connectorId: string) {
        return api.post("/ingestion/connectors/sync", { connectorId });
    },

    async createConnector(type: string, config: any) {
        return api.post("/ingestion/connectors/create", {
            type,
            config,
            frequency: "DAILY"
        });
    }
};
