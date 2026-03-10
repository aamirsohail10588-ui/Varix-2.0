import prisma from "../infrastructure/prisma";
import { accountingService } from "../modules/accounting/accounting.service";
import { analyticsService } from "../modules/analytics/analytics.service";
import { auditService } from "../services/audit.service";

export enum JobType {
    NORMALIZATION = "NORMALIZATION",
    VALIDATION = "VALIDATION",
    CONTROLS = "CONTROLS",
    RISK_SCORING = "RISK_SCORING",
    METRICS_REFRESH = "METRICS_REFRESH"
}

interface JobPayload {
    tenantId: string;
    batchId?: string;
    snapshotId?: string;
    period?: string;
}

class WorkerService {
    private queue: { type: JobType, payload: JobPayload }[] = [];
    private isProcessing: boolean = false;

    async pushJob(type: JobType, payload: JobPayload) {
        console.log(`[WORKER] Enqueueing job: ${type} for tenant ${payload.tenantId}`);
        this.queue.push({ type, payload });
        this.processQueue();
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift();

        if (job) {
            const { type, payload } = job;
            try {
                // Using dynamic require for auditService to avoid potential circular dependency if it grows
                await auditService.logAction("WORKER_JOB_STARTED", "Job", type, { payload }, "SYSTEM", payload.tenantId);
                await this.executeJob(type, payload);
                await auditService.logAction("WORKER_JOB_COMPLETED", "Job", type, { status: "SUCCESS" }, "SYSTEM", payload.tenantId);
            } catch (error: any) {
                console.error(`[WORKER] Job failed: ${type}`, error);
                await auditService.logAction("WORKER_JOB_FAILED", "Job", type, { error: error.message }, "SYSTEM", payload.tenantId);
            }
        }

        this.isProcessing = false;
        setImmediate(() => this.processQueue());
    }

    private async executeJob(type: JobType, payload: JobPayload) {
        const { tenantId, batchId, snapshotId, period } = payload;

        switch (type) {
            case JobType.NORMALIZATION:
                if (batchId && snapshotId) {
                    console.log(`[WORKER] Starting Normalization for batch ${batchId}...`);
                    await accountingService.normalizeBatch(tenantId, batchId, snapshotId);
                    await this.pushJob(JobType.VALIDATION, { tenantId, batchId, snapshotId });
                }
                break;

            case JobType.VALIDATION:
                if (batchId && snapshotId) {
                    console.log(`[WORKER] Starting SQL-based Data Quality Validation for snapshot ${snapshotId}...`);
                    const balanceCheck: any[] = await prisma.$queryRaw`
                        SELECT 
                            SUM(CAST(payload_json->>'debit' AS DECIMAL)) as total_debit,
                            SUM(CAST(payload_json->>'credit' AS DECIMAL)) as total_credit
                        FROM raw_records
                        WHERE "snapshotId" = ${snapshotId}
                    `;

                    const totals = balanceCheck[0] || {};
                    const diff = Math.abs(Number(totals.total_debit || 0) - Number(totals.total_credit || 0));

                    if (diff > 0.01) {
                        await prisma.dataQualityIssue.create({
                            data: {
                                tenantId, batchId, snapshotId,
                                issueType: "DEBIT_CREDIT_MISMATCH",
                                severity: "CRITICAL",
                                details: { diff, total_debit: totals.total_debit, total_credit: totals.total_credit }
                            }
                        });
                    }
                    await this.pushJob(JobType.CONTROLS, { tenantId, snapshotId });
                }
                break;

            case JobType.CONTROLS:
                if (snapshotId) {
                    console.log(`[WORKER] Starting Control Execution for snapshot ${snapshotId}...`);
                    // Logic for executeControls should also be modularized in Governance, but for now we keep the call
                    const { executeControls } = require("./controls.service");
                    await executeControls(tenantId, snapshotId);
                    const date = new Date();
                    const currentPeriod = period || `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
                    await this.pushJob(JobType.RISK_SCORING, { tenantId, period: currentPeriod });
                }
                break;

            case JobType.RISK_SCORING:
                if (period) {
                    console.log(`[WORKER] Recalculating Risk Metrics and FHI for ${period}...`);
                    await analyticsService.calculatePeriodRisk(tenantId, period);
                    await analyticsService.calculateFHI(tenantId, period);
                    await this.pushJob(JobType.METRICS_REFRESH, { tenantId });
                }
                break;

            case JobType.METRICS_REFRESH:
                console.log(`[WORKER] Materializing Ledger Metrics for tenant ${tenantId}...`);
                const trends: any[] = await prisma.$queryRaw`
                    SELECT 
                        DATE("transaction_date") as date,
                        SUM("debit_amount") as "debitTotal",
                        SUM("credit_amount") as "creditTotal",
                        COUNT(id) as "count"
                    FROM "ledger_entries"
                    WHERE "tenant_id" = ${tenantId}
                    GROUP BY DATE("transaction_date")
                `;

                for (const row of trends) {
                    await prisma.materializedLedgerMetric.upsert({
                        where: {
                            tenant_id_metric_date: {
                                tenant_id: tenantId,
                                metric_date: new Date(row.date)
                            }
                        },
                        update: {
                            debit_total: row.debitTotal,
                            credit_total: row.creditTotal,
                            record_count: Number(row.count),
                            calculated_at: new Date()
                        },
                        create: {
                            tenant_id: tenantId,
                            metric_date: new Date(row.date),
                            debit_total: row.debitTotal,
                            credit_total: row.creditTotal,
                            record_count: Number(row.count)
                        }
                    });
                }
                break;

            default:
                console.warn(`[WORKER] Unknown job type: ${type}`);
        }
    }
}

export const workerService = new WorkerService();
