"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import IssueTable from "@/components/enterprise/IssueTable";
import { ShieldCheck, AlertTriangle, Database, Activity, Search } from "lucide-react";

export default function QualityPage() {
    const { governance, integrity, loading, refresh } = useSystemState();

    if (loading || !integrity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Analyzing Quality Vectors...</span>
            </div>
        );
    }

    const qualityIssues = governance.violations.filter(v =>
        v.type.toLowerCase().includes("quality") ||
        v.description.toLowerCase().includes("quality") ||
        v.type.toLowerCase().includes("mismatch")
    ).map(v => ({
        id: v.id,
        title: v.type,
        severity: (v.severity === "high" ? "critical" : v.severity) as any,
        status: v.status,
        detectedAt: "2026-03-11"
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Data Quality & Integrity"
                actions={[
                    { label: "Run Quality Audit", icon: ShieldCheck, onClick: refresh, variant: "primary" },
                    { label: "Schema Validation", icon: Database, onClick: () => console.log("Schema...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Quality Score"
                    value={integrity.final_score.toFixed(1)}
                    trend={0.8}
                    status={(integrity.final_score || 0) > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Critical Gaps"
                    value={qualityIssues.filter(i => i.severity === "critical").length}
                    status={qualityIssues.filter(i => i.severity === "critical").length > 0 ? "error" : "success"}
                    icon={AlertTriangle}
                />
                <MetricTile
                    title="Monitored Fields"
                    value="1,420"
                    status="info"
                    icon={Search}
                />
                <MetricTile
                    title="Schema Health"
                    value="100"
                    status="success"
                    suffix="%"
                    icon={Activity}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Quality Violations</span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded uppercase tracking-tighter">Real-time Detection</span>
                </div>
                <IssueTable
                    issues={qualityIssues}
                    onResolve={(id) => console.log("Resolving", id)}
                />
            </div>
        </div>
    );
}
