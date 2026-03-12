/**
 * MODULE: Benchmark Intelligence Engine
 * PATH: src/modules/intelligence/benchmark.service.ts
 *
 * Responsibilities:
 * - Aggregate anonymized metrics across tenants
 * - Provide industry-relative performance percentiles
 * - Detect strategic anomalies and outliers
 */

import prisma from "../../infrastructure/prisma";

export interface BenchmarkMetric {
    metric_name: string;
    industry: string;
    tenant_value: number;
    industry_median: number;
    industry_75th: number;
    percentile_rank: number;
    is_anomaly: boolean;
}

export class BenchmarkService {
    /**
     * Get industry benchmarks for a tenant
     */
    static async getTenantBenchmarks(tenantId: string): Promise<BenchmarkMetric[]> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { industry: true }
        });

        if (!tenant) throw new Error("Tenant not found");
        const industry = tenant.industry || "Technology";

        // Get latest network metrics for this industry
        const latestMetrics = await (prisma as any).networkMetric.findMany({
            where: { industry },
            orderBy: { calculated_at: 'desc' },
            distinct: ['metric_name']
        });

        // Map metrics to tenant actuals
        // In a real system, we'd pull these from the MaterializedLedgerMetric or FHI table
        const fhi = await (prisma as any).financialHealthIndex.findFirst({
            where: { tenant_id: tenantId },
            orderBy: { period: 'desc' }
        });

        if (!fhi) return [];

        const benchmarkMap: Record<string, number> = {
            "integrity_score": fhi.integrity_component,
            "governance_score": fhi.governance_component,
            "stability_score": fhi.stability_component,
            "performance_score": fhi.performance_component
        };

        return latestMetrics.map((m: any) => {
            const tenantValue = benchmarkMap[m.metric_name] || 0;
            const isAnomaly = tenantValue < m.percentile_25 || tenantValue > m.percentile_95;

            return {
                metric_name: m.metric_name,
                industry,
                tenant_value: tenantValue,
                industry_median: m.percentile_50,
                industry_75th: m.percentile_75,
                percentile_rank: this.estimatePercentile(tenantValue, m),
                is_anomaly: isAnomaly
            };
        });
    }

    /**
     * Estimate percentile rank based on available percentiles
     */
    private static estimatePercentile(value: number, m: any): number {
        if (value >= m.percentile_95) return 95;
        if (value >= m.percentile_75) return 75;
        if (value >= m.percentile_50) return 50;
        if (value >= m.percentile_25) return 25;
        return 10;
    }

    /**
     * Detect strategic anomalies (e.g., sudden shift in stability vs industry)
     */
    static async detectStrategicAnomalies(tenantId: string) {
        const benchmarks = await this.getTenantBenchmarks(tenantId);
        return benchmarks.filter(b => b.is_anomaly);
    }
}
