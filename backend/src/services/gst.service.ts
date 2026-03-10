/**
 * MODULE: GST Service
 * PATH: src/services/gst.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import prisma from "../lib/prisma";

export class GstService {

    validateGstin(gstin: string): boolean {
        const gstinRegex =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    }

    calculateGst(amount: number, rate: number, isInterState: boolean) {
        const totalTax = (amount * rate) / 100;
        if (isInterState) {
            return { igst: totalTax, cgst: 0, sgst: 0, totalTax };
        }
        const splitTax = totalTax / 2;
        return { igst: 0, cgst: splitTax, sgst: splitTax, totalTax };
    }

    async processGstRecords(
        tenantId: string,
        records: {
            gstin: string;
            invoiceNumber: string;
            date: string;
            taxableValue: number;
            igst: number;
            cgst: number;
            sgst: number;
            itcClaimed?: number;
            itcAvailable?: number;
        }[]
    ) {
        const results = [];

        for (const record of records) {
            const isValidGstin = this.validateGstin(record.gstin);

            // Schema field is invoiceNum not invoiceNumber
            const gstRecord = await prisma.gstRecord.create({
                data: {
                    tenantId,
                    gstin: record.gstin,
                    invoiceNum: record.invoiceNumber,
                    invoiceDate: new Date(record.date),
                    taxableValue: record.taxableValue,
                    igstAmount: record.igst,
                    cgstAmount: record.cgst,
                    sgstAmount: record.sgst,
                },
            });

            // ITC Mismatch Check
            if (
                record.itcClaimed !== undefined &&
                record.itcAvailable !== undefined &&
                record.itcClaimed !== record.itcAvailable
            ) {
                // Schema: GstValidation has entityType, entityId, status, issueDetails
                // No gstRecordId field — link via entityType + entityId pattern
                await prisma.gstValidation.create({
                    data: {
                        tenantId,
                        entityType: "GST_RECORD",
                        entityId: gstRecord.id,
                        status: "FAILED",
                        issueDetails: {
                            validationType: "ITC_MISMATCH",
                            claimed: record.itcClaimed,
                            available: record.itcAvailable,
                            details: `Claimed: ${record.itcClaimed}, Available: ${record.itcAvailable}`,
                        },
                    },
                });
            }

            results.push(gstRecord);
        }

        return results;
    }
}

export const gstService = new GstService();