"use client";

import React from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";

export default function UsersAdminPage() {
    const metrics = [
        { title: "Total Users", value: "42", trend: 5.0, status: "info" as const },
        { title: "Active Roles", value: "8", trend: 0, status: "success" as const },
        { title: "MFA Adoption", value: "100", trend: 0.2, status: "success" as const, suffix: "%" },
        { title: "Last Login Activity", value: "24", trend: 15.0, status: "info" as const, suffix: "users/24h" },
    ];

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Role", accessor: "role" },
        { header: "Last Login", accessor: "lastLogin" },
        { header: "Status", accessor: "status" },
        { header: "Assigned Entities", accessor: "entities" },
    ];

    const data = [
        {
            id: "USR-001",
            name: "Aamir Sohail",
            role: "Administrator",
            lastLogin: "Mar 06, 2026 10:45 AM",
            status: "Active",
            entities: "Global Access",
            description: "Platform administrator with full system permissions. Responsibilities include tenant orchestration, role management, and system-wide security oversight."
        },
        {
            id: "USR-002",
            name: "Jane Doe",
            role: "Financial Controller",
            lastLogin: "Mar 06, 2026 09:30 AM",
            status: "Active",
            entities: "North America, EU",
            description: "Financial controller responsible for period close management and intercompany elimination. Access restricted to North American and European subsidiaries."
        },
        {
            id: "USR-003",
            name: "System Admin",
            role: "System Service",
            lastLogin: "Mar 06, 2026 12:00 AM",
            status: "Active",
            entities: "Global Access",
            description: "Automated service account for scheduled ingestion batches, routine data quality checks, and AI-driven variance detection engine."
        },
        {
            id: "USR-004",
            name: "John Auditor",
            role: "External Auditor",
            lastLogin: "Mar 04, 2026 02:15 PM",
            status: "Active",
            entities: "North America",
            description: "Read-only access granted for the Q1 statutory audit. Permission boundaries limited to General Ledger and Accounts Payable modules."
        },
    ];

    return (
        <ModuleWorkspace
            title="Users & Access Control"
            description="Manage organizational access and security at scale. Define granular roles, enforce permission boundaries, and audit user activities."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
