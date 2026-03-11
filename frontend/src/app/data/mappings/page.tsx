"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Layers, ShieldCheck, RefreshCcw, Activity, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MappingsPage() {
    const { loading, refresh } = useSystemState();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Attesting Structural Mappings...</span>
            </div>
        );
    }

    const data = [
        { id: "MAP-001", erpAccount: "SAP-12000 (AR-US)", canonicalAccount: "Accounts Receivable", confidence: 100, status: "Resolved" },
        { id: "MAP-002", erpAccount: "NS-40010 (Sales-EU)", canonicalAccount: "Revenue - Services", confidence: 88, status: "In Review" },
        { id: "MAP-003", erpAccount: "TLY-EXP-65 (Travel)", canonicalAccount: "Travel & Entertainment", confidence: 94, status: "Resolved" },
        { id: "MAP-004", erpAccount: "ZOH-INC-02 (Misc Inc)", canonicalAccount: "Other Income", confidence: 65, status: "Pending Action" },
    ];

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Entity & GL Mappings"
                actions={[
                    { label: "Sync Map", icon: RefreshCcw, onClick: refresh, variant: "primary" },
                    { label: "Export CoA", icon: Layers, onClick: () => console.log("Exporting...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Mapping Coverage"
                    value="92.4"
                    trend={1.5}
                    status="success"
                    suffix="%"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Auto-mapped"
                    value="842"
                    status="info"
                    icon={Activity}
                />
                <MetricTile
                    title="Manual Reviews"
                    value="64"
                    trend={-10.0}
                    status="warning"
                    icon={Search}
                />
                <MetricTile
                    title="Confidence Avg"
                    value="94.8"
                    status="success"
                    suffix="%"
                    icon={Layers}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Mapping Ledger</span>
                </div>
                <OperationalTable
                    data={data}
                    columns={[
                        { header: "ERP Node", accessor: "erpAccount", className: "font-bold text-slate-800" },
                        { header: "Canonical Alias", accessor: "canonicalAccount" },
                        {
                            header: "Confidence",
                            accessor: (item: any) => (
                                <div className="flex items-center space-x-2">
                                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full",
                                                item.confidence > 90 ? "bg-emerald-500" : item.confidence > 70 ? "bg-amber-500" : "bg-rose-500"
                                            )}
                                            style={{ width: `${item.confidence}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600">{item.confidence}%</span>
                                </div>
                            )
                        },
                        {
                            header: "State",
                            accessor: (item: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                    item.status === "Resolved" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {item.status}
                                </span>
                            )
                        },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">Adjust</button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}
