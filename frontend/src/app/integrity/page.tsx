"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function IntegrityPage() {
    const [metrics, setMetrics] = useState([
        { title: "Integrity Score", value: "...", trend: 0, status: "info" as any, suffix: "pts" },
        { title: "Mismatch Rate", value: "...", status: "info" as any },
        { title: "Open Issues", value: "...", status: "info" as any },
        { title: "Evidence Coverage", value: "...", status: "info" as any, suffix: "%" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [healthRes, violationsRes] = await Promise.all([
                    api.get("/analytics/financial-health"),
                    api.get("/governance/violations")
                ]);

                if (healthRes.data) {
                    const h = healthRes.data;
                    setMetrics([
                        { title: "Integrity Score", value: (h.final_score || 0).toFixed(1), trend: 2.1, status: "success", suffix: "pts" },
                        { title: "Integrity Component", value: ((h.integrity_component || 0) * 100).toFixed(1), status: "warning" },
                        { title: "Open Issues", value: violationsRes.data.violations.length.toString(), status: "error" },
                        { title: "Evidence Coverage", value: ((h.evidence_component || 0) * 100).toFixed(1), status: "success", suffix: "%" },
                    ]);
                }

                if (violationsRes.data.violations) {
                    setTableData(violationsRes.data.violations.map((v: any) => ({
                        id: v.id,
                        issueType: v.controlSpec.name,
                        account: v.entity_reference,
                        amount: v.controlSpec.parameters?.threshold ? `$ ${v.controlSpec.parameters.threshold}` : "N/A",
                        source: "ERP Ingestion",
                        date: new Date(v.created_at).toLocaleDateString(),
                        owner: "Unassigned",
                        status: v.severity,
                        description: v.violation_message
                    })));
                }
            } catch (error) {
                console.error("Failed to fetch integrity data", error);
            }
        };

        fetchData();
    }, []);

    const columns = [
        { header: "Issue Type", accessor: "issueType" },
        { header: "Reference", accessor: "account" },
        { header: "Threshold", accessor: "amount" },
        { header: "Source", accessor: "source" },
        { header: "Detected", accessor: "date" },
        { header: "Severity", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Financial Integrity"
            description="Autonomous surveillance and validation of your financial truth. Monitor ledger consistency, entity mapping, and automated reconciliation health."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
