import apiClient from "./apiClient";

export interface RiskVectors {
    tax_risk: number;
    journal_risk: number;
    reconciliation_gap: number;
    compliance_score: number;
}

export const anomalyService = {
    async getRiskVectors(period: string = "2026-Q1"): Promise<RiskVectors> {
        const response = await apiClient.get(`/analytics/risk-vectors?period=${period}`);
        return response.data;
    },

    async calculateRisk(period: string) {
        return apiClient.post(`/analytics/calculate-risk/${period}`);
    }
};
