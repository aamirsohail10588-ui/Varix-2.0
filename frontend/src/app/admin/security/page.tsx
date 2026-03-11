"use client";

import React from "react";
import ModuleWorkspace from "@/components/dashboard/ModuleWorkspace";

export default function SecurityAdminPage() {
    const metrics = [
        { title: "Security Events", value: "1,240", trend: 15.0, status: "info" as const },
        { title: "High Severity", value: "3", trend: -50.0, status: "error" as const },
        { title: "Blocked IPs", value: "128", trend: 12.4, status: "success" as const },
        { title: "Auth Failures", value: "42", trend: -15.0, status: "warning" as const },
    ];

    const columns = [
        { header: "Event Type", accessor: "type" },
        { header: "User", accessor: "user" },
        { header: "IP Address", accessor: "ip" },
        { header: "Timestamp", accessor: "date" },
        { header: "Severity", accessor: "severity" },
        { header: "Status", accessor: "status" },
    ];

    const data = [
        {
            id: "SEC-9901",
            type: "MFA Failure",
            user: "Jane Doe",
            ip: "192.168.1.42",
            date: "Mar 06, 2026 11:12 AM",
            severity: "Medium",
            status: "Resolved",
            description: "Concurrent MFA failures detected for user Jane Doe. IP address flagged for review. User confirmed it was a forgotten device."
        },
        {
            id: "SEC-9902",
            type: "Privilege Escalation",
            user: "John Auditor",
            ip: "203.0.113.88",
            date: "Mar 06, 2026 10:45 AM",
            severity: "Critical",
            status: "Action Required",
            description: "Attempted access to System Configuration module from a Read-Only auditor role. Account temporarily suspended for security review."
        },
        {
            id: "SEC-9903",
            type: "API Key Rotation",
            user: "System Admin",
            ip: "Internal",
            date: "Mar 06, 2026 09:00 AM",
            severity: "Low",
            status: "Success",
            description: "Automated rotation of production API keys for the SAP S/4HANA integration. No downtime detected during the rollover."
        },
        {
            id: "SEC-9904",
            type: "Anomalous Login",
            user: "Aamir Sohail",
            ip: "45.76.12.11",
            date: "Mar 05, 2026 11:45 PM",
            severity: "High",
            status: "In Review",
            description: "Login attempt from an unrecognized geolocation (Tokyo, Japan). User typically logs in from London, UK. Secondary verification pending."
        },
    ];

    return (
        <ModuleWorkspace
            title="Security & Compliance"
            description="Harden your financial governance ecosystem. Manage API security, monitor threat vectors, and ensure complete data privacy."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
