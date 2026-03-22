"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import IssueTable from "@/components/enterprise/IssueTable";
import { ShieldCheck, Eye, Search, Activity, AlertTriangle } from "lucide-react";
import apiClient from "@/services/apiClient";

export default function ControlsPage() {
    const { governance, integrity, loading, refresh } = useSystemState();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Loading Governance Controls...
                </span>
            </div>
        );
    }

    const issues = governance.violations.map((v) => ({
        id: v.id,
        title: v.controlSpec.name,
        severity: v.severity.toUpperCase(),
        status: v.status ?? "OPEN",
        detectedAt: v.created_at
            ? new Date(v.created_at).toLocaleDateString()
            : "—",
    }));

    // Severity is now uppercase — compare correctly
    const criticalCount = governance.violations.filter(
        (v) => v.severity === "CRITICAL" || v.severity === "BLOCKER"
    ).length;
    const highCount = governance.violations.filter(
        (v) => v.severity === "HIGH" || v.severity === "ERROR"
    ).length;

    // Compliance rate derived from integrity score (no separate endpoint for it)
    const complianceRate = integrity
        ? integrity.integrity_component.toFixed(1)
        : "—";

    const handleExportPolicy = async () => {
        try {
            const response = await apiClient.get("/governance/violations/export?format=CSV", {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "VARIX_Policy_Report.csv";
            a.click();
        } catch (err) {
            console.error("Export failed:", err);
        }
    };

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Governance Controls"
                actions={[
                    {
                        label: "Execute All Controls",
                        icon: ShieldCheck,
                        onClick: refresh,
                        variant: "primary",
                    },
                    {
                        label: "Export Policy Report",
                        icon: Search,
                        onClick: handleExportPolicy,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Control Signal"
                    value={complianceRate}
                    trend={0.5}
                    status={
                        integrity && integrity.integrity_component > 90 ? "success" : "warning"
                    }
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Critical / Blockers"
                    value={criticalCount}
                    status={criticalCount > 0 ? "error" : "success"}
                    icon={AlertTriangle}
                />
                <MetricTile
                    title="Open Governance Gaps"
                    value={governance.violations.length}
                    status={governance.violations.length > 5 ? "error" : "warning"}
                    icon={Eye}
                />
                <MetricTile
                    title="High Severity"
                    value={highCount}
                    status={highCount > 0 ? "warning" : "success"}
                    icon={Activity}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Global Violation Registry
                    </span>
                </div>
                <IssueTable
                    issues={issues}
                    onResolve={async (id) => {
                        console.log("Resolving:", id);
                        await refresh();
                    }}
                />
            </div>
        </div>
    );
}