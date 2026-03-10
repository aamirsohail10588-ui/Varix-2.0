"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function IntelligencePage() {
    const [metrics, setMetrics] = useState([
        { title: "Intelligence Score", value: "...", trend: 0, status: "success" as any, suffix: "pts" },
        { title: "Insight Velocity", value: "...", status: "info" as any, suffix: "/mo" },
        { title: "Critical Alerts", value: "...", status: "error" as any },
        { title: "ROI Projection", value: "1.2", trend: 5.4, status: "success" as any, suffix: "M" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const period = "2026-Q1";

                const [healthRes, riskRes, networkRes] = await Promise.all([
                    api.get(`/analytics/financial-health?period=${period}`),
                    api.get(`/analytics/risk-vectors?period=${period}`),
                    api.get("/analytics/benchmarks")
                ]);

                if (healthRes.data) {
                    const h = healthRes.data;
                    setMetrics([
                        { title: "Intelligence Score", value: (h.final_score || 0).toFixed(1), trend: 2.1, status: "success", suffix: "pts" },
                        { title: "Fraud Component", value: ((h.fraud_component || 0) * 100).toFixed(1), trend: 15.0, status: "info", suffix: "pts" },
                        { title: "Critical Alerts", value: "3", trend: -1.0, status: "error", suffix: "" },
                        { title: "ROI Projection", value: "1.2", trend: 5.4, status: "success", suffix: "M" },
                    ]);
                }

                // For table data, use anomalies from network or risk
                const anomaliesRes = await api.get("/analytics/summary");
                const anomalies = anomaliesRes.data.anomalies || [];

                setTableData(anomalies.map((a: any) => ({
                    id: a.id || `INT-${Math.floor(Math.random() * 1000)}`,
                    type: a.type || "Benchmark Variance",
                    impact: a.impact || "$0.00",
                    confidence: a.confidence || 85,
                    period: "March 2026",
                    action: a.recommendation || "Investigate Variance",
                    status: "Action Required",
                    description: a.description || "Identified outlier in financial performance compared to industry benchmarks."
                })));
            } catch (error) {
                console.error("Failed to fetch intelligence data", error);
            }
        };

        fetchIntelligence();
    }, []);

    const columns = [
        { header: "Insight Type", accessor: "type" },
        { header: "Financial Impact", accessor: "impact" },
        {
            header: "Confidence Score", accessor: "confidence", render: (val: number) => (
                <div className="flex items-center space-x-2">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-brand" style={{ width: `${val}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">{val}%</span>
                </div>
            )
        },
        { header: "Detected Period", accessor: "period" },
        { header: "Status", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Financial Intelligence"
            description="Leverage AI-driven insights to uncover hidden financial patterns. Benchmark performance against industry peers and receive proactive governance recommendations."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
