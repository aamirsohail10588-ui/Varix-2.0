import apiClient from "./apiClient";

export interface IntegrityScore {
    final_score: number;
    integrity_component: number;
    governance_component: number;
    stability_component: number;
    performance_component: number;
    total_violations: number;
    journal_mismatch_rate: number;
    duplicate_invoice_rate: number;
    override_frequency: number;
    control_violation_density: number;
    evidence_coverage_ratio: number;
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
