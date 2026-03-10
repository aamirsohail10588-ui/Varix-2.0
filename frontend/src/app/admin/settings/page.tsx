"use client";

import React from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";

export default function SettingsAdminPage() {
    const metrics = [
        { title: "Active Entities", value: "12", trend: 0, status: "info" as const },
        { title: "Modules Enabled", value: "15", trend: 20.0, status: "success" as const },
        { title: "API Health", value: "99.9", trend: 0.1, status: "success" as const, suffix: "%" },
        { title: "Feature Flags", value: "24", trend: 4.2, status: "info" as const },
    ];

    const columns = [
        { header: "Section", accessor: "section" },
        { header: "Last Updated", accessor: "date" },
        { header: "Status", accessor: "status" },
        { header: "Modified By", accessor: "user" },
    ];

    const data = [
        {
            id: "CFG-001",
            section: "Fiscal Calendar",
            date: "Mar 01, 2026",
            status: "Locked",
            user: "Aamir Sohail",
            description: "Definition of the 2026 fiscal year structure. Start date: Jan 01, End date: Dec 31. Reporting frequency: Monthly. Period close window: 7 days."
        },
        {
            id: "CFG-002",
            section: "Entity Hierarchy",
            date: "Mar 05, 2026",
            status: "Active",
            user: "Jane Doe",
            description: "Global organizational structure mapping. Parent: VARIX Corp. Subsidiaries in North America, EU, and APAC grouped for consolidation."
        },
        {
            id: "CFG-003",
            section: "Reporting Standards",
            date: "Jan 12, 2026",
            status: "Active",
            user: "Aamir Sohail",
            description: "Configuration for IFRS and GAAP reporting compliance. Automated elimination rules and depreciation schedules aligned with global standards."
        },
        {
            id: "CFG-004",
            section: "Currency Settings",
            date: "Feb 28, 2026",
            status: "Active",
            user: "System Admin",
            description: "Global currency translation parameters. Base currency: USD. Active FX rate provider: Bloomberg Finance. Revaluation frequency: Daily."
        },
    ];

    return (
        <ModuleWorkspace
            title="Tenant Configuration"
            description="Customize the VARIX platform to your organization's specific needs. Manage entity structures, fiscal calendar preferences, and global governance settings."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
