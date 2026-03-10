"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function ConsolidationPage() {
    const [metrics, setMetrics] = useState([
        { title: "Consolidation Status", value: "8/12", trend: 0, status: "info" as any, suffix: "Entities" },
        { title: "IC Imbalances", value: "...", status: "warning" as any },
        { title: "Elimination Value", value: "4.2", trend: 15.2, status: "success" as any, suffix: "M" },
        { title: "Matching Coverage", value: "...", status: "success" as any, suffix: "%" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchConsolidationData = async () => {
            try {
                const response = await api.get("/analytics/financial-health");
                if (response.data) {
                    const h = response.data;
                    setMetrics([
                        { title: "Consolidation Score", value: ((h.close_component || 0) * 100).toFixed(1), trend: 0, status: "success", suffix: "pts" },
                        { title: "IC Matching", value: ((h.integrity_component || 0) * 100).toFixed(1), status: "warning", suffix: "pts" },
                        { title: "Elimination Value", value: "4.2", status: "success", suffix: "M" },
                        { title: "Matching Coverage", value: "94.8", status: "success", suffix: "%" },
                    ]);
                }

                // For table data, we'll use violations that mention "intercompany" or similar
                const violationsRes = await api.get("/governance/violations");
                const icViolations = (violationsRes.data.violations || []).filter((v: any) =>
                    v.controlSpec.name.toLowerCase().includes("intercompany") ||
                    v.violation_message.toLowerCase().includes("intercompany")
                );

                setTableData(icViolations.map((v: any) => ({
                    id: v.id,
                    from: v.entity_reference || "Parent",
                    to: "Subsidiary",
                    amount: v.controlSpec.parameters?.threshold ? `$ ${v.controlSpec.parameters.threshold}` : "N/A",
                    type: "IC Reconciliation",
                    discrepancy: "Variance Detected",
                    status: v.severity,
                    description: v.violation_message
                })));
            } catch (error) {
                console.error("Failed to fetch consolidation data", error);
            }
        };

        fetchConsolidationData();
    }, []);

    const columns = [
        { header: "From Entity", accessor: "from" },
        { header: "To Entity", accessor: "to" },
        { header: "Amount", accessor: "amount" },
        { header: "Type", accessor: "type" },
        { header: "Details", accessor: "discrepancy" },
        { header: "Status", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Entity Consolidation"
            description="Unify complex multi-entity financial structures. Execute elimination journals, manage intercompany eliminations, and generate group-level financial statements."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
