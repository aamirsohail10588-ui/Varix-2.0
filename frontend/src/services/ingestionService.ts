import apiClient from "./apiClient";

export interface Snapshot {
    id: string;
    status: "UNPROCESSED" | "PROCESSING" | "COMPLETED" | "FAILED";
    record_count: number;
    source_system?: string;
    created_at: string;
}

export const ingestionService = {
    async getHistory(): Promise<Snapshot[]> {
        const response = await apiClient.get("/ingestion/history");
        return response.data;
    },

    async getRecent(): Promise<Snapshot[]> {
        const response = await apiClient.get("/ingestion/recent");
        return response.data;
    },

    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        return apiClient.post("/ingestion/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
    }
};
