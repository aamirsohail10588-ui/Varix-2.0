/**
 * SERVICE: Ingestion Validation & Schema Enforcement
 * PATH: src/modules/ingestion/validation.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { RawPayloadRow } from "./ingestion.service";

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    rowIndices: number[];
}

export class ValidationService {
    /**
     * Validate a batch of raw records against enterprise schema
     */
    static validateRawRecords(payloads: RawPayloadRow[]): ValidationResult {
        const errors: string[] = [];
        const rowIndices: number[] = [];

        payloads.forEach((row, index) => {
            const rowErrors: string[] = [];

            if (!row.transaction_date || isNaN(Date.parse(row.transaction_date))) {
                rowErrors.push("Invalid or missing transaction_date");
            }

            if (!row.account_code) {
                rowErrors.push("Missing account_code");
            }

            if (!row.amount || isNaN(Number(row.amount))) {
                rowErrors.push("Invalid or missing amount");
            }

            if (rowErrors.length > 0) {
                errors.push(`Row ${index}: ${rowErrors.join(", ")}`);
                rowIndices.push(index);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            rowIndices
        };
    }

    /**
     * Log validation issues to the database
     */
    static async logValidationIssues(
        tenantId: string,
        batchId: string,
        snapshotId: string,
        result: ValidationResult
    ) {
        if (result.isValid) return;

        await prisma.dataQualityIssue.create({
            data: {
                tenantId,
                batchId,
                snapshotId,
                issueType: "SCHEMA_VALIDATION",
                severity: "HIGH",
                status: "OPEN",
                details: {
                    errors: result.errors,
                    failedRowIndices: result.rowIndices
                }
            }
        });
    }
}
