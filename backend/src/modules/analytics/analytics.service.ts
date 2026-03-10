import prisma from "../../infrastructure/prisma";

export class AnalyticsService {
    async calculatePeriodRisk(tenantId: string, period: string) {
        const violations = await prisma.controlResult.findMany({
            where: { controlRun: { tenantId } },
            include: { controlSpec: true }
        });

        const totalTransactions = await prisma.ledgerEntry.count({ where: { tenant_id: tenantId } });
        const safeVolume = Math.max(1, totalTransactions);

        let journalFails = 0;
        let taxFails = 0;
        let totalBlockers = 0;

        violations.forEach(v => {
            if (["BLOCKER", "ERROR", "CRITICAL"].includes(v.severity)) totalBlockers++;

            if (["THRESHOLD", "DUPLICATE_INVOICE", "DEBIT_CREDIT_MISMATCH", "SEQUENCE_GAP"].includes(v.controlSpec.ruleType)) {
                if (["BLOCKER", "ERROR", "CRITICAL"].includes(v.severity)) journalFails++;
            }
            if (["GST_MISMATCH", "MISSING_TAX", "INVALID_GSTIN"].includes(v.controlSpec.ruleType) || v.controlSpec.name.includes("Tax")) {
                if (["BLOCKER", "ERROR", "CRITICAL"].includes(v.severity)) taxFails++;
            }
        });

        const journalRisk = Math.min(100, (journalFails / safeVolume) * 100 * 10);
        const taxRisk = Math.min(100, (taxFails / safeVolume) * 100 * 50);

        const overridesCount = await prisma.controlOverride.count({ where: { tenantId } });
        const overrideRisk = totalBlockers > 0 ? Math.min(100, (overridesCount / totalBlockers) * 100) : 0;

        const closeTasks = await prisma.closeTask.findMany({ where: { tenantId } });
        const incompleteCloseTasks = closeTasks.filter((t: any) => t.status !== "COMPLETED").length;
        const closeRisk = closeTasks.length > 0 ? Math.min(100, (incompleteCloseTasks / closeTasks.length) * 100) : 0;

        return await (prisma as any).riskMetric.upsert({
            where: { tenant_id_period: { tenant_id: tenantId, period } },
            update: {
                journal_risk: parseFloat(journalRisk.toFixed(1)),
                tax_risk: parseFloat(taxRisk.toFixed(1)),
                override_risk: parseFloat(overrideRisk.toFixed(1)),
                close_risk: parseFloat(closeRisk.toFixed(1)),
                calculated_at: new Date()
            },
            create: {
                tenant_id: tenantId,
                period,
                journal_risk: parseFloat(journalRisk.toFixed(1)),
                tax_risk: parseFloat(taxRisk.toFixed(1)),
                override_risk: parseFloat(overrideRisk.toFixed(1)),
                close_risk: parseFloat(closeRisk.toFixed(1))
            }
        });
    }

    async getRiskVectors(tenantId: string, period: string) {
        const riskMetric = await (prisma as any).riskMetric.findFirst({
            where: { tenant_id: tenantId, period },
            orderBy: { calculated_at: "desc" }
        });
        return riskMetric || { journal_risk: 0, tax_risk: 0, override_risk: 0, close_risk: 0 };
    }

    async getControlViolations(tenantId: string) {
        return prisma.controlResult.findMany({
            where: { controlRun: { tenantId }, severity: { in: ["BLOCKER", "ERROR"] } },
            orderBy: { created_at: "desc" },
            take: 5,
            include: { controlSpec: true }
        });
    }

    async getCloseProgress(tenantId: string) {
        const activeCycle = await prisma.closeCycle.findFirst({
            where: { tenantId, status: { not: "CLOSED" } },
            orderBy: { createdAt: "desc" },
            include: { tasks: true }
        });

        if (!activeCycle) return null;

        const total = activeCycle.tasks.length;
        const completed = activeCycle.tasks.filter((t: any) => t.status === "COMPLETED").length;
        return {
            name: activeCycle.name,
            progress: {
                total,
                completed,
                percentage: total > 0 ? (completed / total) * 100 : 0
            }
        };
    }

    async getLedgerVolume(tenantId: string) {
        return prisma.ledgerEntry.count({
            where: { tenant_id: tenantId }
        });
    }

    async calculateFHI(tenantId: string, period: string) {
        const WEIGHTS = { INTEGRITY: 0.35, CLOSE_RISK: 0.20, JOURNAL_RISK: 0.20, EVIDENCE: 0.15, FRAUD: 0.10 };

        const integrityData = await this.calculateIntegrityScore(tenantId);
        const integrity_component = integrityData.score;

        const risk = await prisma.riskMetric.findUnique({
            where: { tenant_id_period: { tenant_id: tenantId, period } }
        });

        const close_risk_index = risk?.close_risk || 0;
        const journal_risk_index = risk?.journal_risk || 0;
        const fraud_risk_score = risk?.tax_risk || 0;
        const evidence_component = integrityData.evidence_coverage_ratio;

        const final_score = (
            (integrity_component * WEIGHTS.INTEGRITY) +
            ((100 - close_risk_index) * WEIGHTS.CLOSE_RISK) +
            ((100 - journal_risk_index) * WEIGHTS.JOURNAL_RISK) +
            (evidence_component * WEIGHTS.EVIDENCE) +
            ((100 - fraud_risk_score) * WEIGHTS.FRAUD)
        );

        return prisma.financialHealthIndex.upsert({
            where: { tenant_id_period: { tenant_id: tenantId, period } },
            update: {
                integrity_component,
                close_component: Math.max(0, 100 - close_risk_index),
                control_component: Math.max(0, 100 - journal_risk_index),
                change_risk_component: Math.max(0, 100 - (risk?.override_risk || 0)),
                fraud_component: Math.max(0, 100 - fraud_risk_score),
                evidence_component,
                final_score,
                calculated_at: new Date()
            },
            create: {
                tenant_id: tenantId,
                period,
                integrity_component,
                close_component: Math.max(0, 100 - close_risk_index),
                control_component: Math.max(0, 100 - journal_risk_index),
                change_risk_component: Math.max(0, 100 - (risk?.override_risk || 0)),
                fraud_component: Math.max(0, 100 - fraud_risk_score),
                evidence_component,
                final_score
            }
        });
    }

    async getFHIHistory(tenantId: string, limit = 12) {
        return prisma.financialHealthIndex.findMany({
            where: { tenant_id: tenantId },
            orderBy: { period: 'desc' },
            take: limit
        });
    }

    async getTenantBenchmarks(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { industry: true }
        });
        if (!tenant) throw new Error("Tenant not found");

        const industry = tenant.industry || "Technology";
        const integrity = await this.calculateIntegrityScore(tenantId);

        const latestMetrics = await prisma.networkMetric.findMany({
            where: { industry },
            orderBy: { calculated_at: 'desc' },
            take: 20
        });

        const fallbackMedians: Record<string, number> = {
            duplicate_invoice_rate: 0.7,
            journal_mismatch_rate: 0.5,
            control_violation_density: 0.4,
            close_cycle_duration: 6,
            evidence_coverage_ratio: 82,
            override_frequency: 1.2
        };

        const tenantActuals: Record<string, number> = {
            duplicate_invoice_rate: integrity.duplicate_invoice_rate,
            journal_mismatch_rate: integrity.journal_mismatch_rate,
            control_violation_density: 0.4,
            close_cycle_duration: 5,
            evidence_coverage_ratio: integrity.score,
            override_frequency: integrity.override_frequency
        };

        return Object.keys(fallbackMedians).map(name => {
            const actual = tenantActuals[name];
            const m = latestMetrics.find(lm => lm.metric_name === name);
            const median = m?.percentile_50 || fallbackMedians[name];
            const p75 = m?.percentile_75 || median * 1.5;

            let isAnomaly = (name === 'evidence_coverage_ratio') ? actual < (median * 0.7) : (actual > p75 && p75 > 0);

            return {
                metric_name: name,
                industry,
                tenant_value: parseFloat(actual.toFixed(2)),
                industry_median: median,
                industry_75th: p75,
                benchmark_score: parseFloat((actual / (median || 1)).toFixed(2)),
                is_anomaly: isAnomaly
            };
        });
    }

    async calculateIntegrityScore(tenantId: string) {
        const totalTransactions = await prisma.ledgerEntry.count({ where: { tenant_id: tenantId } });
        const safeVolume = Math.max(1, totalTransactions);

        const dqi = await prisma.dataQualityIssue.groupBy({
            by: ['issueType'],
            where: { tenantId },
            _count: { id: true }
        });

        let dupeCount = 0;
        let mismatchCount = 0;
        dqi.forEach(d => {
            if (d.issueType === 'DUPLICATE_INVOICE') dupeCount = d._count.id;
            if (d.issueType === 'BALANCE_MISMATCH' || d.issueType === 'PATTERN_MISMATCH') mismatchCount += d._count.id;
        });

        const totalViolations = await prisma.controlResult.count({ where: { controlRun: { tenantId } } });
        const overridesCount = await prisma.controlOverride.count({ where: { tenantId } });
        const densityCount = await prisma.controlResult.count({
            where: { controlRun: { tenantId }, severity: { in: ['CRITICAL', 'BLOCKER', 'ERROR', 'HIGH'] } }
        });

        const journal_mismatch_rate = (mismatchCount / safeVolume);
        const duplicate_invoice_rate = (dupeCount / Math.max(1, totalTransactions / 2));
        const override_frequency = (overridesCount / Math.max(1, totalViolations));
        const control_violation_density = (densityCount / safeVolume);

        const score = Math.max(0, Math.min(100, 100 - (journal_mismatch_rate * 25) - (duplicate_invoice_rate * 20) - (override_frequency * 15) - (control_violation_density * 20)));

        return {
            score: parseFloat(score.toFixed(1)),
            total_violations: totalViolations,
            journal_mismatch_rate: parseFloat((journal_mismatch_rate * 100).toFixed(2)),
            duplicate_invoice_rate: parseFloat((duplicate_invoice_rate * 100).toFixed(2)),
            override_frequency: parseFloat((override_frequency * 100).toFixed(2)),
            control_violation_density: parseFloat((control_violation_density * 100).toFixed(2)),
            evidence_coverage_ratio: 85
        };
    }

    async generateNetworkBenchmarks() {
        console.log("[Network] Generating industry benchmarks...");
        const tenants = await prisma.tenant.findMany({ select: { id: true, industry: true } });
        const groups: Record<string, any> = {};

        for (const tenant of tenants) {
            const ind = tenant.industry || "Technology";
            if (!groups[ind]) groups[ind] = { duplicate_invoice_rate: [], journal_mismatch_rate: [], override_frequency: [] };

            const integrity = await this.calculateIntegrityScore(tenant.id);
            groups[ind].duplicate_invoice_rate.push(integrity.duplicate_invoice_rate);
            groups[ind].journal_mismatch_rate.push(integrity.journal_mismatch_rate);
            groups[ind].override_frequency.push(integrity.override_frequency);
        }

        for (const [industry, metrics] of Object.entries(groups)) {
            const timestamp = new Date();
            for (const [metricName, values] of Object.entries(metrics as any)) {
                if ((values as any).length === 0) continue;
                const sorted = (values as any).sort((a: number, b: number) => a - b);
                const avg = sorted.reduce((a: number, b: number) => a + b, 0) / sorted.length;

                await prisma.networkMetric.create({
                    data: {
                        industry,
                        company_size: "ALL",
                        metric_name: metricName,
                        average_value: avg,
                        percentile_25: sorted[Math.floor(sorted.length * 0.25)],
                        percentile_50: sorted[Math.floor(sorted.length / 2)],
                        percentile_75: sorted[Math.floor(sorted.length * 0.75)],
                        percentile_95: sorted[Math.floor(sorted.length * 0.95)],
                        calculated_at: timestamp
                    }
                });
            }
        }
    }
}

export const analyticsService = new AnalyticsService();
