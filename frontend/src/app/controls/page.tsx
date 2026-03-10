"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import ModuleWorkspace from "../components/dashboard/ModuleWorkspace";

export default function ControlsPage() {
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchViolations();
    }, []);

    const fetchViolations = async () => {
        try {
            const res = await api.get("/governance/violations?limit=100");
            setViolations(res.data.violations || []);
        } catch (error) {
            console.error("Failed to fetch violations", error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = [
        { title: "Compliance Rate", value: "98.5", trend: 0.5, status: "success" as const, suffix: "%" },
        { title: "Failed Controls", value: violations.filter(v => v.controlSpec?.severity === 'CRITICAL').length, trend: -5.0, status: "error" as const },
        { title: "Critical Violations", value: violations.length, trend: 12.0, status: "warning" as const },
        { title: "Avg Resolution Time", value: "6.5", trend: -1.2, status: "info" as const, suffix: "hrs" },
    ];

    const columns = [
        { header: "Violation ID", accessor: "id", render: (val: string) => <span className="text-xs font-mono">{val.substring(0, 8)}...</span> },
        { header: "Control Name", accessor: "controlName", render: (_: any, row: any) => row.controlSpec?.name || "Unknown Control" },
        { header: "Severity", accessor: "severity", render: (_: any, row: any) => row.controlSpec?.severity || "MEDIUM" },
        { header: "Violation Message", accessor: "violation_message" },
        { header: "Assigned To", accessor: "owner", render: () => "Aamir Sohail" },
        { header: "Status", accessor: "status", render: () => "Pending Action" },
    ];

    const tableData = violations.map(v => ({
        ...v,
        id: v.id,
        controlName: v.controlSpec?.name,
        severity: v.controlSpec?.severity,
        status: "Pending Action", // Mocking status for UI
        description: v.violation_message
    }));

    return (
        <ModuleWorkspace
            title="Governance Controls"
            description="Comprehensive surveillance of financial policy enforcement. Monitor compliance rates, identify failed controls, and manage critical governance violations."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
