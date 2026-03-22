"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Layers, ShieldCheck, RefreshCcw, Activity, AlertTriangle } from "lucide-react";

export default function ConsolidationPage() {
    const { integrity, governance, loading, refresh } = useSystemState();

    if (loading || !integrity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Attesting Entity Consolidation...
                </span>
            </div>
        );
    }

    // Intercompany violations — severity now uppercase
    const icViolations = governance.violations.filter(
        (v) =>
            v.controlSpec.name.toLowerCase().includes("intercompany") ||
            v.violation_message.toLowerCase().includes("intercompany") ||
            v.controlSpec.name.toLowerCase().includes("elimination")
    );

    // Consolidation score derived from integrity (stability_component if available,
    // else fall back to integrity_component)
    const consolidationScore = integrity.integrity_component.toFixed(1);

    const tableData = icViolations.map((v) => ({
        id: v.id,
        from: "Parent Entity",
        to: "Counterparty",
        type: v.controlSpec.name,
        ref: `IC-${v.id.substring(0, 4).toUpperCase()}`,
        status: v.status ?? "OPEN",
        severity: v.severity.toUpperCase(),
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Entity Consolidation"
                actions={[
                    {
                        label: "Run Elimination Journals",
                        icon: ShieldCheck,
                        onClick: refresh,
                        variant: "primary",
                    },
                    {
                        label: "Consolidation Report",
                        icon: Layers,
                        onClick: refresh,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="IC Matching Signal"
                    value={consolidationScore}
                    status={integrity.integrity_component > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={Activity}
                />
                <MetricTile
                    title="Integrity Component"
                    value={integrity.integrity_component.toFixed(1)}
                    status={integrity.integrity_component > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={RefreshCcw}
                />
                <MetricTile
                    title="IC Violations"
                    value={icViolations.length}
                    status={icViolations.length > 0 ? "warning" : "success"}
                    icon={AlertTriangle}
                />
                <MetricTile
                    title="Total Violations"
                    value={integrity.total_violations ?? governance.violations.length}
                    status={
                        (integrity.total_violations ?? governance.violations.length) > 0
                            ? "warning"
                            : "success"
                    }
                    icon={Layers}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Intercompany Elimination Ledger
                    </span>
                </div>
                {tableData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No intercompany violations detected. Consolidation nominal.
                    </div>
                ) : (
                    <OperationalTable
                        data={tableData}
                        columns={[
                            { header: "Origin Entity", accessor: "from" as any },
                            { header: "Counterparty", accessor: "to" as any },
                            {
                                header: "Elimination Type",
                                accessor: "type" as any,
                                className: "font-bold text-slate-800",
                            },
                            { header: "Reference", accessor: "ref" as any },
                            {
                                header: "Severity",
                                accessor: (item: any) => (
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                            item.severity === "CRITICAL" ||
                                                item.severity === "BLOCKER"
                                                ? "bg-rose-50 text-rose-600"
                                                : item.severity === "HIGH"
                                                    ? "bg-orange-50 text-orange-600"
                                                    : "bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        {item.severity}
                                    </span>
                                ),
                            },
                            {
                                header: "State",
                                accessor: (item: any) => (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                        {item.status}
                                    </span>
                                ),
                            },
                            {
                                header: "Actions",
                                accessor: () => (
                                    <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">
                                        Post Elimination
                                    </button>
                                ),
                                className: "text-right",
                            },
                        ]}
                    />
                )}
            </div>
        </div>
    );
}