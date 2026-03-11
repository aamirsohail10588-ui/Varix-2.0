import apiClient from "./apiClient";

export interface ReconciliationRun {
    id: string;
    period: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    unmatched_count: number;
    total_count: number;
    created_at: string;
}

export const reconciliationService = {
    async getRuns(): Promise<ReconciliationRun[]> {
        // Fetching summary which contains the latest metrics
        const response = await apiClient.get("/reconciliation/summary");
        return response.data.recent_runs || [];
    },

    async triggerRun(period: string) {
        return apiClient.post("/reconciliation/run", { period });
    },

    async getUnmatched(period: string) {
        return apiClient.get(`/reconciliation/unmatched?period=${period}`);
    }
};
