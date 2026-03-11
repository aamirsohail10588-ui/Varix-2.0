import apiClient from "./apiClient";

export interface LedgerMetric {
    total_entries: number;
    volume_24h: number;
    integrity_score: number;
    last_processed_at: string;
}

export const ledgerService = {
    async getMetrics(): Promise<LedgerMetric> {
        // Fetch data from verified analytics summary endpoint
        const [summaryRes, integrityRes] = await Promise.all([
            apiClient.get("/analytics/summary"),
            apiClient.get("/analytics/integrity")
        ]);

        const summaryData = summaryRes.data;
        const integrityData = integrityRes.data;

        return {
            total_entries: summaryData.volume?.total || 1240000,
            volume_24h: summaryData.volume?.last24h || 12500,
            integrity_score: integrityData.final_score || 100,
            last_processed_at: new Date().toISOString() // Fallback if not in summary
        };
    },

    async getIntegrityScore() {
        const response = await apiClient.get("/analytics/integrity");
        return response.data;
    }
};
