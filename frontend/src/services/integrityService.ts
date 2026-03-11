import apiClient from "./apiClient";

export interface IntegrityScore {
    final_score: number;
    integrity_component: number;
    risk_component: number;
    anomaly_component: number;
    timestamp: string;
}

export const integrityService = {
    async getIntegrityScore(): Promise<IntegrityScore> {
        const response = await apiClient.get("/analytics/integrity");
        return response.data;
    },

    async getFinancialHealth(period: string = "2026-Q1") {
        const response = await apiClient.get(`/analytics/financial-health?period=${period}`);
        return response.data;
    }
};
