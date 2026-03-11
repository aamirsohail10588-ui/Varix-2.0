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
        return response.data.summary;
    }
};
