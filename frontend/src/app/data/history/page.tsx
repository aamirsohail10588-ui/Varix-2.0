"use client";

import React from "react";
import { useSystem } from "@/context/SystemContext";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { History, Database, CheckCircle2, Clock, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const { ingestion, loading, refresh } = useSystem();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Retrieving Ingestion History...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Ingestion History"
                actions={[
                    { label: "Refresh History", icon: History, onClick: refresh, variant: "primary" },
                    { label: "Export Audit Log", icon: Download, onClick: () => console.log("Exporting...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Total Batches"
                    value={ingestion.history.length}
                    trend={12.5}
                    status="info"
                    icon={Database}
                />
                <MetricTile
                    title="Active Queue"
                    value={ingestion.queueDepth}
                    status={ingestion.queueDepth > 0 ? "warning" : "success"}
                    icon={Clock}
                />
                <MetricTile
                    title="Ingestion Health"
                    value="99.8"
                    status="success"
                    suffix="%"
                    icon={CheckCircle2}
                />
                <MetricTile
                    title="System Latency"
                    value="30ms"
                    status="success"
                    icon={History}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operation Pipeline Stream</span>
                </div>
                <OperationalTable
                    data={ingestion.history.map(s => ({
                        id: s.id,
                        source: s.source_system || "SYSTEM_CSV",
                        count: (s.record_count || 0).toLocaleString(),
                        status: s.status,
                        date: new Date(s.created_at).toLocaleString()
                    }))}
                    columns={[
                        { header: "Snapshot ID", accessor: (item: any) => <span className="font-mono">{item.id.substring(0, 8)}</span> },
                        { header: "Source Node", accessor: "source", className: "font-bold text-slate-800" },
                        { header: "Volume", accessor: "count" },
                        {
                            header: "Status",
                            accessor: (item: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                    item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {item.status}
                                </span>
                            )
                        },
                        { header: "Detected At", accessor: "date" },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                                    <Eye size={14} />
                                </button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}
