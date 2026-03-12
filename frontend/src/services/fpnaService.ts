import apiClient from "./apiClient";

export interface Benchmark {
    category: string;
    metric: string;
    value: number;
    industry_avg: number;
    percentile: number;
}

export interface FPNASummary {
    net_income: number;
    revenue: number;
    expenses: number;
    forecast_variance: number;
}

export const fpnaService = {
    async getBenchmarks(): Promise<Benchmark[]> {
        const response = await apiClient.get("/analytics/benchmarks");
        return response.data.benchmarks || [];
    },

    async getSummary(): Promise<FPNASummary> {
        const response = await apiClient.get("/analytics/summary");
        // Mapping backend response to FPNASummary interface
        const data = response.data;
        return {
            net_income: data.volume?.total * 0.15 || 0, // Heuristic for demo
            revenue: data.volume?.total || 0,
            expenses: data.volume?.total * 0.85 || 0,
            forecast_variance: data.closeProgress?.completion_rate ? (100 - data.closeProgress.completion_rate) : 0
        };
    }
};
