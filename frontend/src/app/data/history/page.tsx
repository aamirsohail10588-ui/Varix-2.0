"use client";

import React from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";

export default function HistoryPage() {
    const metrics = [
        { title: "Total Batches", value: "1,240", trend: 12.5, status: "info" as const },
        { title: "Records Ingested", value: "854.2", trend: 8.2, status: "success" as const, suffix: "K" },
        { title: "Success Rate", value: "99.8", trend: 0.1, status: "success" as const, suffix: "%" },
        { title: "Avg Duration", value: "4.2", trend: -5.4, status: "success" as const, suffix: "min" },
    ];

    const columns = [
        { header: "Batch ID", accessor: "id" },
        { header: "Source System", accessor: "source" },
        { header: "Record Count", accessor: "count" },
        { header: "Status", accessor: "status" },
        { header: "Start Time", accessor: "startTime" },
        { header: "End Time", accessor: "endTime" },
        { header: "Error Count", accessor: "errors" },
    ];

    const data = [
        {
            id: "BAT-9901",
            source: "SAP S/4HANA",
            count: "12,450",
            status: "Success",
            startTime: "Mar 06, 2026 09:12 AM",
            endTime: "Mar 06, 2026 09:15 AM",
            errors: 0,
            description: "Full snapshot synchronization for AR Sub-ledger. Transformation mapping applied: SAP_BASIC_RECON. No validation errors detected."
        },
        {
            id: "BAT-9902",
            source: "Oracle NetSuite",
            count: "8,200",
            status: "Resolved",
            startTime: "Mar 06, 2026 08:30 AM",
            endTime: "Mar 06, 2026 08:34 AM",
            errors: 12,
            description: "Incremental load of journal entries. 12 records failed validation initially due to missing entity mapping but were resolved via auto-mapping engine."
        },
        {
            id: "BAT-9903",
            source: "Tally Prime",
            count: "450",
            status: "Error",
            startTime: "Mar 06, 2026 07:00 AM",
            endTime: "Mar 06, 2026 07:02 AM",
            errors: 450,
            description: "Agent connection timed out during extraction. Tally ODBC driver failed to respond. Retrying in 15 minutes."
        },
        {
            id: "BAT-9904",
            source: "Zoho Books",
            count: "1,150",
            status: "In Review",
            startTime: "Mar 06, 2026 06:15 AM",
            endTime: "Mar 06, 2026 06:17 AM",
            errors: 0,
            description: "Scheduled daily sync of expense records. Integration health check: Optimal. Quality score: 100%."
        },
    ];

    return (
        <ModuleWorkspace
            title="Ingestion History"
            description="Audit the lifecycle of every data packet ingested into VARIX. Track batch statuses, record counts, and synchronization lineages from all source systems."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
