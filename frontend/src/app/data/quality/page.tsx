"use client";

import React from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";

export default function QualityPage() {
    const metrics = [
        { title: "Quality Score", value: "96.4", trend: 0.8, status: "success" as const, suffix: "pts" },
        { title: "Critical Issues", value: "8", trend: -12.0, status: "error" as const },
        { title: "Monitored Fields", value: "1,420", trend: 5.0, status: "info" as const },
        { title: "Schema Health", value: "100", trend: 0, status: "success" as const, suffix: "%" },
    ];

    const columns = [
        { header: "Field Name", accessor: "field" },
        { header: "Issue Type", accessor: "type" },
        { header: "Record Count", accessor: "count" },
        { header: "Severity", accessor: "severity" },
        { header: "Detected Date", accessor: "date" },
        { header: "Status", accessor: "status" },
    ];

    const data = [
        {
            id: "DQ-8801",
            field: "Vendor_Tax_ID",
            type: "Missing Value",
            count: "124",
            severity: "Critical",
            date: "Mar 06, 2026",
            status: "Action Required",
            description: "124 records in the Procurement module are missing essential Tax IDs. This will block automated tax validation for upcoming filings."
        },
        {
            id: "DQ-8802",
            field: "Transaction_Date",
            type: "Invalid Format",
            count: "12",
            severity: "High",
            date: "Mar 05, 2026",
            status: "In Review",
            description: "Detected non-ISO date formats in legacy ERP sync batch. Data requires normalization before it can be used for period-over-period variance analysis."
        },
        {
            id: "DQ-8803",
            field: "Invoice_Total",
            type: "Duplicate Record",
            count: "3",
            severity: "Critical",
            date: "Mar 06, 2026",
            status: "Pending Action",
            description: "High-confidence duplicate invoices detected across entity 'North America'. Values, vendors, and dates match exactly. Potential double-payment risk."
        },
        {
            id: "DQ-8804",
            field: "Currency_Code",
            type: "Domain Violation",
            count: "42",
            severity: "Medium",
            date: "Mar 04, 2026",
            status: "Resolved",
            description: "Unsupported currency codes detected in auxiliary ledger. Records have been automatically remapped to canonical ISO-4217 counterparts."
        },
    ];

    return (
        <ModuleWorkspace
            title="Data Quality & Integrity"
            description="Guarantee the precision of your financial data. Identify duplicates, validate field formats, and resolve schema mismatches."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
