import api from "@/lib/api";

export interface RiskVectors {
    journal_risk: number;
    tax_risk: number;
    override_risk: number;
    close_risk: number;
}

export const anomalyService = {
    async getRiskVectors(period: string = "2026-03"): Promise<RiskVectors> {
        const response = await api.get(`/analytics/risk-vectors?period=${period}`);
        return response.data;
    }
};
