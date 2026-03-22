"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { History, Database, CheckCircle2, Clock, Eye, Download } from "lucide-react";
import apiClient from "@/services/apiClient";

export default function HistoryPage() {
    const { ingestion, health, loading, refresh } = useSystemState();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Retrieving Ingestion History...
                </span>
            </div>
        );
    }

    // Compute real metrics from ingestion history
    const completedBatches = ingestion.history.filter(
        (s: any) => s.status === "COMPLETED"
    ).length;
    const completionRate =
        ingestion.history.length > 0
            ? ((completedBatches / ingestion.history.length) * 100).toFixed(1)
            : "0";

    const handleExportAuditLog = async () => {
        try {
            const response = await apiClient.get(
                "/tenants/audit-logs?limit=1000",
            );
            const logs = response.data.logs || [];
            const csv = [
                ["ID", "Action", "Entity Type", "User", "Timestamp"].join(","),
                ...logs.map((l: any) =>
                    [
                        l.id,
                        l.action,
                        l.entity_type,
                        l.user?.name ?? "System",
                        new Date(l.createdAt).toISOString(),
                    ].join(",")
                ),
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "VARIX_AuditLog.csv";
            a.click();
        } catch (err) {
            console.error("Export failed:", err);
        }
    };

    const tableData = ingestion.history.map((s: any) => ({
        id: s.id,
        shortId: s.id.substring(0, 8),
        source: s.source_system || "SYSTEM_CSV",
        count: (s.record_count || 0).toLocaleString(),
        status: s.status,
        date: new Date(s.created_at).toLocaleString(),
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Ingestion History"
                actions={[
                    {
                        label: "Refresh History",
                        icon: History,
                        onClick: refresh,
                        variant: "primary",
                    },
                    {
                        label: "Export Audit Log",
                        icon: Download,
                        onClick: handleExportAuditLog,
                    },
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
                    title="Completion Rate"
                    value={completionRate}
                    status={parseFloat(completionRate) >= 95 ? "success" : "warning"}
                    suffix="%"
                    icon={CheckCircle2}
                />
                <MetricTile
                    title="System Latency"
                    value={health ? `${health.latency}ms` : "—"}
                    status={
                        health && health.latency < 500 ? "success" : "warning"
                    }
                    icon={History}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Operation Pipeline Stream
                    </span>
                </div>
                <OperationalTable
                    data={tableData}
                    columns={[
                        {
                            header: "Snapshot ID",
                            accessor: (item: any) => (
                                <span className="font-mono text-slate-500">{item.shortId}</span>
                            ),
                        },
                        {
                            header: "Source Node",
                            accessor: "source" as any,
                            className: "font-bold text-slate-800",
                        },
                        { header: "Volume", accessor: "count" as any },
                        {
                            header: "Status",
                            accessor: (item: any) => (
                                <span
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                        item.status === "COMPLETED"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : item.status === "FAILED"
                                                ? "bg-rose-50 text-rose-600"
                                                : "bg-blue-50 text-blue-600"
                                    )}
                                >
                                    {item.status}
                                </span>
                            ),
                        },
                        { header: "Detected At", accessor: "date" as any },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                                    <Eye size={14} />
                                </button>
                            ),
                            className: "text-right",
                        },
                    ]}
                />
            </div>
        </div>
    );
}