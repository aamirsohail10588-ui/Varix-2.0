import api from "@/lib/api";

export interface Snapshot {
    id: string;
    status: "UNPROCESSED" | "PROCESSING" | "COMPLETED" | "FAILED";
    record_count: number;
    source_system?: string; // Derived from batch on backend usually
    created_at: string;
}

export const snapshotService = {
    async getHistory(): Promise<Snapshot[]> {
        const response = await api.get("/ingestion/history");
        return response.data;
    },

    async getRecent(): Promise<Snapshot[]> {
        const response = await api.get("/ingestion/recent");
        return response.data;
    }
};
