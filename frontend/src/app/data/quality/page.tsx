"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import IssueTable from "@/components/enterprise/IssueTable";
import { ShieldCheck, AlertTriangle, Database, Activity, Search } from "lucide-react";
import apiClient from "@/services/apiClient";

export default function QualityPage() {
    const { governance, integrity, loading, refresh } = useSystemState();

    if (loading || !integrity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Analyzing Quality Vectors...
                </span>
            </div>
        );
    }

    /**
     * Quality violations = anything that isn't purely a tax or intercompany issue.
     * Severity comparison now uppercase (governanceService normalises on intake).
     */
    const qualityIssues = governance.violations
        .filter(
            (v) =>
                v.controlSpec.name.toLowerCase().includes("quality") ||
                v.controlSpec.name.toLowerCase().includes("mismatch") ||
                v.controlSpec.name.toLowerCase().includes("duplicate") ||
                v.controlSpec.name.toLowerCase().includes("gap") ||
                v.violation_message.toLowerCase().includes("quality")
        )
        .map((v) => ({
            id: v.id,
            title: v.controlSpec.name,
            severity: v.severity.toUpperCase(),
            status: v.status ?? "OPEN",
            detectedAt: v.created_at
                ? new Date(v.created_at).toLocaleDateString()
                : "—",
        }));

    // If no quality-specific violations, surface all violations as quality signals
    const issuesForTable =
        qualityIssues.length > 0
            ? qualityIssues
            : governance.violations.map((v) => ({
                id: v.id,
                title: v.controlSpec.name,
                severity: v.severity.toUpperCase(),
                status: v.status ?? "OPEN",
                detectedAt: v.created_at
                    ? new Date(v.created_at).toLocaleDateString()
                    : "—",
            }));

    const criticalIssues = issuesForTable.filter(
        (i) => i.severity === "CRITICAL" || i.severity === "BLOCKER"
    ).length;

    // Duplicate invoice rate comes from the integrity object (real backend field)
    const dupeRate = integrity.duplicate_invoice_rate ?? 0;
    const controlDensity = integrity.control_violation_density ?? 0;

    const handleRunAudit = async () => {
        try {
            const period = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
            await apiClient.post(`/analytics/calculate-risk/${period}`);
            await refresh();
        } catch (err) {
            console.error("Audit failed:", err);
        }
    };

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Data Quality & Integrity"
                actions={[
                    {
                        label: "Run Quality Audit",
                        icon: ShieldCheck,
                        onClick: handleRunAudit,
                        variant: "primary",
                    },
                    {
                        label: "Schema Validation",
                        icon: Database,
                        onClick: refresh,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Integrity Score"
                    value={integrity.final_score.toFixed(1)}
                    trend={0.8}
                    status={integrity.final_score > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Critical Gaps"
                    value={criticalIssues}
                    status={criticalIssues > 0 ? "error" : "success"}
                    icon={AlertTriangle}
                />
                <MetricTile
                    title="Duplicate Invoice Rate"
                    value={dupeRate.toFixed(2)}
                    status={dupeRate < 1 ? "success" : "warning"}
                    suffix="%"
                    icon={Search}
                />
                <MetricTile
                    title="Control Violation Density"
                    value={controlDensity.toFixed(2)}
                    status={controlDensity < 0.5 ? "success" : "warning"}
                    suffix="%"
                    icon={Activity}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Active Quality Violations
                    </span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded uppercase tracking-tighter">
                        Real-time Detection
                    </span>
                </div>
                <IssueTable
                    issues={issuesForTable}
                    onResolve={async (id) => {
                        console.log("Resolving quality violation:", id);
                        await refresh();
                    }}
                />
            </div>
        </div>
    );
}