"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Layers, ShieldCheck, RefreshCcw, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConsolidationPage() {
    const { integrity, governance, loading, refresh } = useSystemState();

    if (loading || !integrity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Attesting Entity Consolidation...</span>
            </div>
        );
    }

    const icViolations = governance.violations.filter(v =>
        v.type.toLowerCase().includes("intercompany") ||
        v.description.toLowerCase().includes("intercompany")
    );

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Entity Consolidation"
                actions={[
                    { label: "Run Elimination Journals", icon: ShieldCheck, onClick: refresh, variant: "primary" },
                    { label: "Consolidation Report", icon: Layers, onClick: () => console.log("Report...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Consolidation Score"
                    value="94.2"
                    trend={0.5}
                    status="success"
                    suffix="pts"
                    icon={Activity}
                />
                <MetricTile
                    title="IC Matching"
                    value={integrity.integrity_component.toFixed(1)}
                    status={integrity.integrity_component > 90 ? "success" : "warning"}
                    suffix="pts"
                    icon={RefreshCcw}
                />
                <MetricTile
                    title="Imbalance Count"
                    value={icViolations.length}
                    status={icViolations.length > 0 ? "warning" : "success"}
                    icon={AlertTriangle}
                />
                <MetricTile
                    title="Elimination Value"
                    value="4.2"
                    trend={15.2}
                    status="success"
                    suffix="M"
                    icon={Layers}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intercompany Elimination Ledger</span>
                </div>
                <OperationalTable
                    data={icViolations.map(v => ({
                        id: v.id,
                        from: "Parent Entity",
                        to: "Subsidiary A",
                        amount: "$ 45,000",
                        type: "IC Reconciliation",
                        status: v.status,
                        severity: v.severity
                    }))}
                    columns={[
                        { header: "Origin Entity", accessor: "from" },
                        { header: "Counterparty", accessor: "to" },
                        { header: "Elimination Type", accessor: "type", className: "font-bold text-slate-800" },
                        { header: "Value", accessor: "amount" },
                        {
                            header: "Severity",
                            accessor: (item: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    item.severity === "high" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                                )}>
                                    {item.severity}
                                </span>
                            )
                        },
                        {
                            header: "State",
                            accessor: (item: any) => (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                    {item.status}
                                </span>
                            )
                        },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">Post Elimination</button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}
