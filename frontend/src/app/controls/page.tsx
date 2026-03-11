"use client";

import React from "react";
import { useSystem } from "@/context/SystemContext";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import IssueTable from "@/components/enterprise/IssueTable";
import { ShieldCheck, Eye, Search, Activity, AlertTriangle } from "lucide-react";

export default function ControlsPage() {
    const { governance, loading, refresh } = useSystem();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Loading Governance Controls...</span>
            </div>
        );
    }

    const issues = governance.violations.map(v => ({
        id: v.id,
        title: v.type,
        severity: (v.severity === "high" ? "critical" : v.severity) as any,
        status: v.status,
        detectedAt: "2026-03-11"
    }));

    const criticalCount = governance.violations.filter(v => v.severity === "high").length;

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Governance Controls"
                actions={[
                    { label: "Execute All Controls", icon: ShieldCheck, onClick: refresh, variant: "primary" },
                    { label: "Export Policy Report", icon: Search, onClick: () => console.log("Exporting...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Compliance Rate"
                    value="98.5"
                    trend={0.5}
                    status="success"
                    suffix="%"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Critical Violations"
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
                    title="Avg. Resolution"
                    value="6.5"
                    trend={-1.2}
                    status="info"
                    suffix="hrs"
                    icon={Activity}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Violation Registry</span>
                </div>
                <IssueTable
                    issues={issues}
                    onResolve={(id) => console.log("Resolving", id)}
                />
            </div>
        </div>
    );
}
