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
    async getRuns(): Promise<any[]> {
        const response = await apiClient.get("/reconciliation/summary");
        // Backend returns summary: { totalBankTransactions, matchedTransactions, ... }
        // We wrap it in an array to satisfy existing types if needed, or return empty
        return [];
    },

    async getSummary(): Promise<any> {
        const response = await apiClient.get("/reconciliation/summary");
        return response.data;
    },

    async triggerRun(period: string) {
        return apiClient.post("/reconciliation/run", { period });
    },

    async getUnmatched(period: string) {
        return apiClient.get(`/reconciliation/unmatched?period=${period}`);
    }
};
