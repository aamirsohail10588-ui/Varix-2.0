"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function ChangesPage() {
    const [metrics, setMetrics] = useState([
        { title: "Change Volume", value: "...", trend: 0, status: "info" as any, suffix: "ev" },
        { title: "High-Risk Changes", value: "...", status: "error" as any },
        { title: "Pending Approvals", value: "...", status: "warning" as any },
        { title: "Avg Resolution", value: "4.2", trend: -2.1, status: "success" as any, suffix: "hrs" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchChanges = async () => {
            try {
                const response = await api.get("/changes/recent");
                const labeledChanges = response.data.data || [];

                setMetrics([
                    { title: "Total Changes", value: labeledChanges.length.toString(), trend: 8.2, status: "info", suffix: "ev" },
                    { title: "High-Risk", value: "14", trend: -12.5, status: "error", suffix: "" },
                    { title: "Audit Persistence", value: "100", trend: 0, status: "success", suffix: "%" },
                    { title: "Resolution Time", value: "4.2", trend: -2.1, status: "success", suffix: "hrs" },
                ]);

                setTableData(labeledChanges.map((c: any) => ({
                    id: c.id.substring(0, 8).toUpperCase(),
                    entity: c.entity_type || "System",
                    account: c.entity_id || "Global Config",
                    type: c.display_label || c.change_type,
                    amount: "Canonical Ledger",
                    user: "System",
                    date: new Date(c.detected_at).toLocaleDateString(),
                    status: "Resolved",
                    description: `Change detected via ${c.change_type} event on ${c.entity_type}.`
                })));
            } catch (error) {
                console.error("Failed to fetch changes", error);
            }
        };

        fetchChanges();
    }, []);

    const columns = [
        { header: "Change ID", accessor: "id" },
        { header: "Entity", accessor: "entity" },
        { header: "Reference", accessor: "account" },
        { header: "Action", accessor: "type" },
        { header: "Impact", accessor: "amount" },
        { header: "User", accessor: "user" },
        { header: "Status", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Financial Changes"
            description="Track every modification across your financial ecosystem. Analyze variances, journal overrides, and structural changes with complete lineage."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
