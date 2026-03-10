import { transformToCanonicalCSV } from "./src/transform";
import fs from "fs";
import path from "path";

async function run() {
    const mockTallyRows = [
        {
            $Date: "2026-03-05",
            $PartyLedgerName: "Bank Account A",
            $VoucherTypeName: "Receipt",
            $VoucherNumber: "RC-101",
            $Amount: "5000.00",
            $AlterId: 1001
        },
        {
            $Date: "2026-03-05",
            $PartyLedgerName: "Sales Revenue",
            $VoucherTypeName: "Receipt",
            $VoucherNumber: "RC-101",
            $Amount: "-5000.00",
            $AlterId: 1002
        }
    ];

    console.log("Mocking Tally Rows: ", mockTallyRows);

    const csvBuffer = transformToCanonicalCSV(mockTallyRows);
    console.log("Generated CSV:\n", csvBuffer.toString());

    fs.writeFileSync(path.join(__dirname, "test_output.csv"), csvBuffer);
    console.log("Wrote test_output.csv successfully");
}

run().catch(console.error);
