const fs = require("fs");

const ROWS = 1000000; // change to 10000000 for 10M
const output = "varix_enterprise_dataset.csv";

const entities = [
    "North America", "Europe", "Asia", "Middle East", "India",
    "LATAM", "Africa", "Australia", "Japan", "Canada"
];

const accounts = [
    ["4001", "Sales Revenue"],
    ["1200", "Accounts Receivable"],
    ["5001", "Office Expense"],
    ["2100", "Accounts Payable"],
    ["6100", "Travel Expense"],
    ["7001", "Misc Expense"],
    ["3001", "Inventory"],
    ["2200", "Tax Payable"],
    ["1300", "Prepaid Expense"],
    ["4100", "Service Revenue"]
];

const vendors = [
    "ABC Supplies",
    "ABC SUPPLIES",
    "Global Office Ltd",
    "TravelDesk Inc",
    "Stationery Hub",
    "Metro Services",
    ""
];

const customers = [
    "Acme Corp",
    "Zenith Ltd",
    "Nova Retail",
    "BlueSky LLC",
    "OmniTrade",
    ""
];

const currencies = ["USD", "EUR", "INR", "JPY"];
const taxCodes = ["GST18", "GST5", "VAT20", ""];
const costCenters = ["CC01", "CC02", "CC03", "CC04", ""];

const stream = fs.createWriteStream(output);

stream.write(
    "transaction_id,transaction_date,entity,account_code,account_name,debit,credit,currency,vendor_name,customer_name,document_type,document_number,tax_code,cost_center\n"
);

for (let i = 0; i < ROWS; i++) {

    const acc = accounts[Math.floor(Math.random() * accounts.length)];

    const debit = Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : 0;
    const credit = Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : 0;

    const row = [
        `TXN${i}`,
        `2026-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
        entities[Math.floor(Math.random() * entities.length)],
        Math.random() < 0.02 ? "" : acc[0],
        acc[1],
        debit,
        credit,
        currencies[Math.floor(Math.random() * currencies.length)],
        vendors[Math.floor(Math.random() * vendors.length)],
        customers[Math.floor(Math.random() * customers.length)],
        "Invoice",
        `DOC${Math.floor(Math.random() * 1000000)}`,
        taxCodes[Math.floor(Math.random() * taxCodes.length)],
        costCenters[Math.floor(Math.random() * costCenters.length)]
    ];

    stream.write(row.join(",") + "\n");

    if (i % 100000 === 0) {
        console.log("Generated", i);
    }
}

stream.end();

console.log("Dataset created:", output);