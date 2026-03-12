/**
 * SERVICE: Data Conditioning & Normalization
 * PATH: src/modules/governance/conditioning.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { Prisma } from "@prisma/client";

export interface ConditioningResult {
    entityId: string;
    finalValue: any;
    confidenceScore: number;
    fixes: string[];
}

export class ConditioningService {
    /**
     * Normalize and condition a ledger entry
     */
    static async conditionLedgerEntry(
        tenantId: string,
        rawData: any,
        sourceSystem: string,
        runId?: string
    ): Promise<ConditioningResult> {
        let confidenceScore = 100;
        const fixes: string[] = [];

        // 1. Currency Normalization
        if (!rawData.currency || rawData.currency === "") {
            rawData.currency = "USD"; // Default
            fixes.push("SET_DEFAULT_CURRENCY");
            confidenceScore -= 5;
        }

        // 2. Amount Repair
        let debit = parseFloat(rawData.debit_amount || rawData.debit || "0");
        let credit = parseFloat(rawData.credit_amount || rawData.credit || "0");

        if (debit < 0) {
            debit = Math.abs(debit);
            fixes.push("FIX_NEGATIVE_DEBIT");
            confidenceScore -= 10;
        }
        if (credit < 0) {
            credit = Math.abs(credit);
            fixes.push("FIX_NEGATIVE_CREDIT");
            confidenceScore -= 10;
        }

        // 3. Account Mapping
        let targetAccountId = rawData.account_id;
        const accountCode = (rawData.account_code || rawData.account || "").trim().toUpperCase();

        if (accountCode) {
            const map = await prisma.accountMap.findUnique({
                where: {
                    tenant_id_source_system_source_code: {
                        tenant_id: tenantId,
                        source_system: sourceSystem,
                        source_code: accountCode
                    }
                }
            });

            if (map) {
                targetAccountId = map.target_account_id;
                confidenceScore = Math.min(confidenceScore, map.confidence_score);
            } else {
                // Check if account already exists with that code in the target system
                const directMatch = await prisma.account.findUnique({
                    where: { tenantId_code: { tenantId, code: accountCode } }
                });

                if (directMatch) {
                    targetAccountId = directMatch.id;
                } else {
                    const unmapped = await prisma.account.findFirst({
                        where: { tenantId, code: "UNMAPPED" }
                    });
                    targetAccountId = unmapped?.id;
                    fixes.push("USE_UNMAPPED_ACCOUNT");
                    confidenceScore -= 20;
                }
            }
        }

        return {
            entityId: rawData.id || "",
            finalValue: {
                ...rawData,
                debit_amount: debit,
                credit_amount: credit,
                account_id: targetAccountId,
                currency: rawData.currency.toUpperCase()
            },
            confidenceScore,
            fixes
        };
    }

    /**
     * Log conditioning actions for auditing
     */
    static async logConditioning(
        tenantId: string,
        entityType: string,
        entityId: string,
        originalValue: any,
        fixes: string[],
        confidenceDelta: number,
        runId?: string
    ) {
        if (fixes.length === 0) return;

        await prisma.conditioningLog.create({
            data: {
                tenant_id: tenantId,
                run_id: runId,
                entity_type: entityType,
                entity_id: entityId,
                original_value: originalValue as Prisma.InputJsonValue,
                applied_fix: fixes.join(", "),
                confidence_delta: confidenceDelta
            }
        });
    }
}
