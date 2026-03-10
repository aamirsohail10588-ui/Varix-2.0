import { exec } from "child_process";
import path from "path";
import fs from "fs";

const dbUrl = "postgresql://postgres:8884913056@Aamir@localhost:5432/varix?schema=public";
const ledgerTempPath = path.join(process.cwd(), "uploads", "test_copy.csv");

async function debugCopy() {
    if (!fs.existsSync(path.dirname(ledgerTempPath))) {
        fs.mkdirSync(path.dirname(ledgerTempPath), { recursive: true });
    }

    // Create a valid 1-row CSV for LedgerEntry
    const header = "id,tenant_id,transaction_date,account_id,debit_amount,credit_amount,currency,source_system,ingestion_batch_id,source_id,confidence_score\n";
    const row = "30000000-0000-0000-0000-000000000000,9262e3d3-7d7b-40f4-a4b0-a0833b3d24c0,2024-03-06,00000000-0000-0000-0000-000000000000,100.00,0.00,USD,DEBUG,BATCH_001,TXN_001,100\n";
    fs.writeFileSync(ledgerTempPath, header + row);

    const cmd = `psql "${dbUrl}" -c "\\copy ledger_entries(id, tenant_id, transaction_date, account_id, debit_amount, credit_amount, currency, source_system, ingestion_batch_id, source_id, confidence_score) FROM '${ledgerTempPath.replace(/\\/g, '/')}' WITH (FORMAT csv, HEADER true)"`;

    console.log("Running command:", cmd);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error("ERROR:", error.message);
            console.error("STDERR:", stderr);
        } else {
            console.log("SUCCESS:", stdout);
        }
    });
}

debugCopy();
