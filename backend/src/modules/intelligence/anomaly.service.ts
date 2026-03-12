/**
 * MODULE: Anomaly Detection Service
 * PATH: src/modules/intelligence/anomaly.service.ts
 *
 * Responsibilities:
 * - Perform outlier detection on LedgerEntries
 * - Create AnomalyAlerts for high-risk transactions
 * - Integrate with GovernanceService for approval routing
 */

import prisma from "../../infrastructure/prisma";
import { FeatureEngineeringService } from "./features.service";
import { GovernanceService } from "../governance/governance.service";

export class AnomalyService {
    /**
     * Scan a batch of ledger entries for anomalies
     */
    static async scanBatchForAnomalies(batchId: string) {
        const entries = await (prisma as any).ledgerEntry.findMany({
            where: { ingestion_batch_id: batchId }
        });

        const results = [];
        for (const entry of entries) {
            const anomaly = await this.scoreEntry(entry);
            if (anomaly) {
                results.push(anomaly);
            }
        }

        return results;
    }

    /**
     * Score a single ledger entry for anomalies
     */
    static async scoreEntry(entry: any) {
        const amount = Math.max(parseFloat(entry.debit_amount), parseFloat(entry.credit_amount));
        const features = await FeatureEngineeringService.getAmountFeatures(entry.tenant_id, entry.account_id, amount);

        const isUnusualTime = FeatureEngineeringService.isUnusualTiming(new Date(entry.transaction_date));

        let severity = "LOW";
        let confidenceScore = 0;
        let reasoning = [];

        if (features.zScore > 5.0) {
            severity = "CRITICAL";
            confidenceScore = 95;
            reasoning.push(`Extreme outlier: Amount is ${features.zScore.toFixed(2)} standard deviations from mean.`);
        } else if (features.zScore > 3.0) {
            severity = "HIGH";
            confidenceScore = 80;
            reasoning.push(`Significant outlier: Amount is ${features.zScore.toFixed(2)} sigma from mean.`);
        }

        if (isUnusualTime) {
            confidenceScore += 10;
            reasoning.push("Transaction occurred at an unusual time (outside business hours).");
        }

        if (confidenceScore >= 50) {
            const alert = await (prisma as any).anomalyAlert.create({
                data: {
                    tenantId: entry.tenant_id,
                    ledgerEntryId: entry.id,
                    confidenceScore,
                    reasoning: reasoning.join(" "),
                    severity,
                    status: "OPEN"
                }
            });

            // Integration with Layer 11: Route CRITICAL anomalies for approval
            if (severity === "CRITICAL") {
                // In a real system, we'd look up the "Anomaly Approval" workflow
                // For prototype, we'll assume a generic workflow or just flag it
                // await GovernanceService.createApprovalRequest(...);
            }

            return alert;
        }

        return null;
    }

    /**
     * Get open alerts for a tenant
     */
    static async getOpenAlerts(tenantId: string) {
        return await (prisma as any).anomalyAlert.findMany({
            where: {
                tenantId,
                status: "OPEN"
            },
            include: {
                ledgerEntry: true
            },
            orderBy: {
                confidenceScore: "desc"
            }
        });
    }
}
