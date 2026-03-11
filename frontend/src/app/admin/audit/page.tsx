"use client";

import React from "react";
import ModuleWorkspace from "@/components/dashboard/ModuleWorkspace";

export default function AuditAdminPage() {
    const metrics = [
        { title: "Log Volume", value: "84.2", trend: 5.4, status: "info" as const, suffix: "K" },
        { title: "Active Users", value: "24", trend: 0, status: "success" as const },
        { title: "Module Activity", value: "482", trend: 12.0, status: "info" as const },
        { title: "Admin Actions", value: "12", trend: -2.0, status: "warning" as const },
    ];

    const columns = [
        { header: "Timestamp", accessor: "date" },
        { header: "User", accessor: "user" },
        { header: "Action", accessor: "action" },
        { header: "Affected Entity", accessor: "entity" },
        { header: "Module", accessor: "module" },
        { header: "Details", accessor: "description" },
    ];

    const data = [
        {
            id: "AUD-001",
            date: "Mar 06, 2026 12:15 PM",
            user: "Aamir Sohail",
            action: "Configuration Update",
            entity: "Global",
            module: "Tenant Admin",
            description: "Modified fiscal year start date from Jan 01 to Apr 01 for the upcoming reporting cycle. Authorization code: ADMIN-8821."
        },
        {
            id: "AUD-002",
            date: "Mar 06, 2026 11:45 AM",
            user: "Jane Doe",
            action: "Issue Resolution",
            entity: "North America",
            module: "Financial Integrity",
            description: "Marked variance mismatch REC-1192 as 'Resolved'. Applied adjustment journal: AJ-2026-004. Variance reason: Currency rounding."
        },
        {
            id: "AUD-003",
            date: "Mar 06, 2026 09:12 AM",
            user: "System Admin",
            action: "Batch Ingestion",
            entity: "APAC Region",
            module: "Data Ingestion",
            description: "Automated daily sync for Oracle NetSuite instance. Ingested 12,450 records across 14 entities. Error rate: 0.0%."
        },
        {
            id: "AUD-004",
            date: "Mar 05, 2026 04:30 PM",
            user: "John Auditor",
            action: "Data Export",
            entity: "North America",
            module: "Reports",
            description: "Exported 'General Ledger Sample - Q1' in XLSX format for statutory audit purposes. IP captured: 203.0.113.88."
        },
    ];

    return (
        <ModuleWorkspace
            title="Global Audit Trail"
            description="The definitive record of all system interactions. Search, filter, and export comprehensive logs to fulfill regulatory requirements and internal investigations."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
