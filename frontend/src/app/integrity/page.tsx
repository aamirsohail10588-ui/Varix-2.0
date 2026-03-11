"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import IssueTable from "@/components/enterprise/IssueTable";
import { ShieldCheck, Scale, Eye, Search, Activity } from "lucide-react";

export default function IntegrityPage() {
    const { integrity, anomalies, governance, loading, refresh } = useSystemState();

    if (loading || !integrity || !anomalies) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Attesting Integrity Signals...</span>
            </div>
        );
    }

    const issues = governance.violations.map(v => ({
        id: v.id,
        title: v.type, // Map 'type' to 'title' for IssueTable
        severity: (v.severity === "high" ? "critical" : v.severity) as any,
        status: v.status,
        detectedAt: "2026-03-11" // Placeholder for now, should come from API
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Integrity"
                actions={[
                    { label: "Run Integrity Scan", icon: ShieldCheck, onClick: refresh, variant: "primary" },
                    { label: "Export Evidence", icon: Scale, onClick: () => console.log("Exporting...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Integrity Score"
                    value={integrity.final_score.toFixed(1)}
                    trend={2.1}
                    status={(integrity.final_score || 0) > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Integrity Component"
                    value={(integrity.integrity_component).toFixed(1)}
                    status={(integrity.integrity_component || 0) > 90 ? "success" : "warning"}
                    icon={Activity}
                />
                <MetricTile
                    title="Journal Risk"
                    value={anomalies.journal_risk.toFixed(1)}
                    trend={-5.2}
                    status={anomalies.journal_risk < 40 ? "success" : "error"}
                    icon={Search}
                />
                <MetricTile
                    title="Open Integrity Gaps"
                    value={governance.violations.length}
                    status={governance.violations.length > 0 ? "error" : "success"}
                    icon={Eye}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Integrity Violations</span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded uppercase tracking-tighter">Real-time Detection</span>
                </div>
                <IssueTable
                    issues={issues}
                    onResolve={(id) => console.log("Resolving", id)}
                />
            </div>
        </div>
    );
}
