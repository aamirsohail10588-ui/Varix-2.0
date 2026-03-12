/**
 * SERVICE: GAAP Compliance & Accounting Integrity
 * PATH: src/modules/ledger/gaap.service.ts
 */

export class GAAPComplianceService {
    /**
     * Verify the fundamental accounting equation for a batch or session
     * Assets = Liabilities + Equity
     */
    static verifyBalance(entries: any[]): boolean {
        let totalDebit = 0;
        let totalCredit = 0;

        for (const entry of entries) {
            totalDebit += parseFloat(entry.debit_amount || "0");
            totalCredit += parseFloat(entry.credit_amount || "0");
        }

        // Financial systems allow a tiny margin for floating point, but VARIX uses Decimals
        // Total Debit - Total Credit should be exactly 0
        return Math.abs(totalDebit - totalCredit) < 0.0001;
    }

    /**
     * Enforce specific accounting rules
     */
    static validateEntry(entry: any): string[] {
        const errors: string[] = [];

        // 1. Transaction must have at least one side (debit or credit)
        if (parseFloat(entry.debit_amount) === 0 && parseFloat(entry.credit_amount) === 0) {
            errors.push("ZERO_VALUE_LINE_ITEM");
        }

        // 2. Cannot have both debit and credit on the same line item
        if (parseFloat(entry.debit_amount) > 0 && parseFloat(entry.credit_amount) > 0) {
            errors.push("MUTUAL_EXCLUSION_VIOLATION");
        }

        return errors;
    }
}
