import api from "@/lib/api";

export interface IntegrityScore {
    final_score: number;
    integrity_component: number;
    period: string;
}

export const integrityService = {
    async getFinancialHealth(period: string = "2026-03"): Promise<IntegrityScore> {
        const response = await api.get(`/analytics/financial-health?period=${period}`);
        return response.data;
    }
};
