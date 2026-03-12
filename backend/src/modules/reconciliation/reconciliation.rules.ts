/**
 * MODULE: Reconciliation Matching Rules
 * PATH: src/modules/reconciliation/reconciliation.rules.ts
 */

export interface MatchScore {
    total: number;
    breakdown: {
        amount: number;
        date: number;
        reference: number;
        currency: number;
    };
}

export class ReconciliationRules {
    /**
     * Calculate a matching score between a bank transaction and a ledger entry
     */
    static calculateScore(bankTx: any, ledgerEntry: any): MatchScore {
        const breakdown = {
            amount: 0,
            date: 0,
            reference: 0,
            currency: 0
        };

        // 1. Currency Match (Mandatory)
        if (bankTx.currency !== ledgerEntry.currency) {
            return { total: 0, breakdown };
        }
        breakdown.currency = 1.0;

        // 2. Amount Score (Target: Exact matches, allow small variance)
        const bankAmount = Math.abs(parseFloat(bankTx.amount));
        const ledgerAmount = Math.abs(parseFloat(ledgerEntry.debit_amount) - parseFloat(ledgerEntry.credit_amount));
        const diff = Math.abs(bankAmount - ledgerAmount);

        if (diff === 0) {
            breakdown.amount = 0.5; // Base weight for amount
        } else if (diff < 1.0) { // Less than $1 difference
            breakdown.amount = 0.4;
        } else if (diff < 5.0) {
            breakdown.amount = 0.2;
        }

        // 3. Date Score (Target: Exact matches, allow +/- 3 days)
        const dateDiffDays = Math.abs(
            (new Date(bankTx.transactionDate).getTime() - new Date(ledgerEntry.transaction_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dateDiffDays === 0) {
            breakdown.date = 0.3;
        } else if (dateDiffDays <= 1) {
            breakdown.date = 0.25;
        } else if (dateDiffDays <= 3) {
            breakdown.date = 0.15;
        }

        // 4. Reference/Description Score (Fuzzy search)
        const bankDesc = (bankTx.description || "").toLowerCase();
        const leRef = (ledgerEntry.source_id || "").toLowerCase();
        const leSys = (ledgerEntry.source_system || "").toLowerCase();

        if (leRef && bankDesc.includes(leRef)) {
            breakdown.reference = 0.2;
        } else if (bankDesc.includes(leSys)) {
            breakdown.reference = 0.1;
        }

        const total = breakdown.amount + breakdown.date + breakdown.reference;

        return { total, breakdown };
    }
}
