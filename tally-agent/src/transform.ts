import { Parser } from "json2csv";

/**
 * Transforms flat Tally SQL Voucher output into a canonical Varix Ledger Entry CSV
 * @param odbcRows Array of rows from Tally ODBC Query
 */
export function transformToCanonicalCSV(odbcRows: any[]): Buffer {
    if (!odbcRows || odbcRows.length === 0) {
        return Buffer.from(""); // Empty buffer if no rows
    }

    const canonicalData = odbcRows.map((row) => {
        // Tally Amounts: 
        // Debit is usually positive or negative depending on context. Let's normalize. 
        // Tally handles debit/credit inherently using Amount (positive = debit, negative = credit typically for some ledgers).

        let debit_amount = 0;
        let credit_amount = 0;
        const rawAmount = Number(row.$Amount) || 0;

        // This logic varies heavily on tally version and query structure. Basic approximation mapping natively. 
        if (rawAmount > 0) {
            debit_amount = rawAmount;
        } else {
            credit_amount = Math.abs(rawAmount);
        }

        return {
            transaction_date: row.$Date || new Date().toISOString().split("T")[0], // Fallback to today
            account_id: row.$PartyLedgerName || "Unknown Account",
            debit_amount: debit_amount,
            credit_amount: credit_amount,
            currency: "INR", // Assuming base currently
            source_system: "TALLY",
            // Add custom fields
            voucher_type: row.$VoucherTypeName,
            voucher_number: row.$VoucherNumber,
            raw_tally_alter_id: row.$AlterId
        };
    });

    const fields = [
        "transaction_date",
        "account_id",
        "debit_amount",
        "credit_amount",
        "currency",
        "source_system",
        "voucher_type",
        "voucher_number",
        "raw_tally_alter_id"
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(canonicalData);

    return Buffer.from(csv, "utf-8");
}
