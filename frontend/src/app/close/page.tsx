"use client";

import React from "react";
import { useSystem } from "@/context/SystemContext";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { CalendarCheck, ShieldCheck, Clock, Zap, FileText } from "lucide-react";

export default function ClosePage() {
    const { governance, loading, refresh } = useSystem();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Attesting Close Readiness...</span>
            </div>
        );
    }

    const tasks = governance.currentCycle?.tasks || [];
    const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
    const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Close"
                actions={[
                    { label: "Finalize Period", icon: ShieldCheck, onClick: () => console.log("Finalizing..."), variant: "primary" },
                    { label: "Export Evidence", icon: FileText, onClick: () => console.log("Evidence...") }
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
                    title="Days to Deadline"
                    value="2"
                    status="warning"
                    icon={Clock}
                />
                <MetricTile
                    title="Reconciliation"
                    value="98.2"
                    status="success"
                    suffix="%"
                    icon={Zap}
                />
                <MetricTile
                    title="Integrity Gaps"
                    value={governance.violations.length}
                    status={governance.violations.length > 0 ? "error" : "success"}
                    icon={ShieldCheck}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Close Checklist</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter">Period: March 2026</span>
                </div>
                <OperationalTable
                    data={tasks.map((t: any) => ({
                        id: t.id,
                        activity: t.name || t.description,
                        assigned: t.assignedRoleId || "Controller",
                        status: t.status,
                        due: "Oct 15"
                    }))}
                    columns={[
                        { header: "Activity", accessor: "activity", className: "font-bold text-slate-800" },
                        { header: "Role", accessor: "assigned" },
                        { header: "Due Date", accessor: "due" },
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
                        {
                            header: "Actions",
                            accessor: (item: any) => (
                                <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">Mark Done</button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}

// Add cn import
import { cn } from "@/lib/utils";
