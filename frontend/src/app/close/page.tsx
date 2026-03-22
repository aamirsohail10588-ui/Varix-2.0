"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { CalendarCheck, ShieldCheck, Clock, Zap, FileText } from "lucide-react";
import apiClient from "@/services/apiClient";
import { governanceService } from "@/services/governanceService";

export default function ClosePage() {
    const { governance, reconciliation, loading, refresh } = useSystemState();
    const [actioningId, setActioningId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Attesting Close Readiness...
                </span>
            </div>
        );
    }

    const tasks = governance.currentCycle?.tasks || [];
    const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
    const progress =
        tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    // Use real reconciliation summary instead of hardcoded "98.2"
    const matchRate = reconciliation.summary
        ? `${reconciliation.summary.matchRate.toFixed(1)}%`
        : "—";

    const handleMarkDone = async (taskId: string) => {
        setActioningId(taskId);
        try {
            await governanceService.approveTask(taskId, "APPROVED");
            await refresh();
        } catch (err) {
            console.error("Failed to approve task:", err);
        } finally {
            setActioningId(null);
        }
    };

    const handleStartCycle = async () => {
        try {
            await governanceService.startCycle();
            await refresh();
        } catch (err) {
            console.error("Failed to start cycle:", err);
        }
    };

    const handleExportEvidence = async () => {
        try {
            const response = await apiClient.get(
                "/governance/violations/export?format=PDF",
                { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "VARIX_Evidence_Package.pdf";
            a.click();
        } catch (err) {
            console.error("Export failed:", err);
        }
    };

    const tableData = tasks.map((t: any) => ({
        id: t.id,
        activity: t.name || t.description || "—",
        assigned: t.assignedRoleId || "Controller",
        status: t.status,
        due: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
    }));

    const currentPeriod = governance.currentCycle?.name ?? "No Active Cycle";

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Close"
                actions={[
                    {
                        label: governance.currentCycle ? "Finalize Period" : "Start Close Cycle",
                        icon: ShieldCheck,
                        onClick: governance.currentCycle
                            ? async () => { await refresh(); }
                            : handleStartCycle,
                        variant: "primary",
                    },
                    {
                        label: "Export Evidence",
                        icon: FileText,
                        onClick: handleExportEvidence,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Close Progress"
                    value={progress}
                    status={progress > 90 ? "success" : "warning"}
                    suffix="%"
                    icon={CalendarCheck}
                />
                <MetricTile
                    title="Tasks Remaining"
                    value={tasks.length - completed}
                    status={tasks.length - completed > 0 ? "warning" : "success"}
                    icon={Clock}
                />
                <MetricTile
                    title="Reconciliation"
                    value={matchRate}
                    status={
                        reconciliation.summary && reconciliation.summary.matchRate >= 95
                            ? "success"
                            : "warning"
                    }
                    icon={Zap}
                />
                <MetricTile
                    title="Integrity Gaps"
                    value={governance.violations.length}
                    status={governance.violations.length > 0 ? "error" : "success"}
                    icon={ShieldCheck}
                />
            </div>

            {!governance.currentCycle ? (
                <div className="p-8 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-3">
                    <p className="text-slate-500 text-sm font-medium">No active close cycle.</p>
                    <button
                        onClick={handleStartCycle}
                        className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-widest"
                    >
                        Start Close Cycle
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Master Close Checklist
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter">
                            {currentPeriod}
                        </span>
                    </div>
                    <OperationalTable
                        data={tableData}
                        columns={[
                            {
                                header: "Activity",
                                accessor: "activity" as any,
                                className: "font-bold text-slate-800",
                            },
                            { header: "Role", accessor: "assigned" as any },
                            { header: "Due Date", accessor: "due" as any },
                            {
                                header: "Status",
                                accessor: (item: any) => (
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                            item.status === "COMPLETED"
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-blue-50 text-blue-600"
                                        )}
                                    >
                                        {item.status}
                                    </span>
                                ),
                            },
                            {
                                header: "Actions",
                                accessor: (item: any) => (
                                    <button
                                        disabled={
                                            item.status === "COMPLETED" ||
                                            actioningId === item.id
                                        }
                                        onClick={() => handleMarkDone(item.id)}
                                        className="text-[9px] font-black text-primary-brand uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {actioningId === item.id
                                            ? "..."
                                            : item.status === "COMPLETED"
                                                ? "Done"
                                                : "Mark Done"}
                                    </button>
                                ),
                                className: "text-right",
                            },
                        ]}
                    />
                </div>
            )}
        </div>
    );
}