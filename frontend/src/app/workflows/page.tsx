"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Zap, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function WorkflowsPage() {
    const { governance, loading, refresh } = useSystemState();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Orchestrating Workflows...</span>
            </div>
        );
    }

    const tasks = governance.currentCycle?.tasks || [];
    const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
    const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    const pendingReview = tasks.filter((t: any) => t.status === "PENDING" || t.status === "REVIEW").length;

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Workflows"
                actions={[
                    { label: "Refresh Status", icon: Zap, onClick: refresh, variant: "primary" },
                    { label: "Assign Tasks", icon: Clock, onClick: () => console.log("Assigning...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Cycle Progress"
                    value={progress}
                    status={progress > 80 ? "success" : "warning"}
                    suffix="%"
                    icon={CheckCircle2}
                />
                <MetricTile
                    title="Active Tasks"
                    value={tasks.length}
                    status="info"
                    icon={Zap}
                />
                <MetricTile
                    title="Pending Review"
                    value={pendingReview}
                    status={pendingReview > 5 ? "warning" : "success"}
                    icon={AlertCircle}
                />
                <MetricTile
                    title="Avg. Cycle Speed"
                    value="18.2"
                    status="success"
                    suffix="days"
                    icon={Clock}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Operational Tasks</span>
                </div>
                <OperationalTable
                    data={tasks.map((t: any) => ({
                        id: t.id,
                        workflow: "Financial Close",
                        priority: t.priority || "Medium",
                        owner: t.assignedRoleId || "Unassigned",
                        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Pending",
                        status: t.status,
                        name: t.name || t.description
                    }))}
                    columns={[
                        { header: "Task ID", accessor: (item: any) => <span className="text-mono">{item.id.substring(0, 8)}</span> },
                        { header: "Workflow Domain", accessor: "workflow" },
                        { header: "Activity", accessor: "name", className: "font-bold text-slate-800" },
                        {
                            header: "Priority",
                            accessor: (item: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    item.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                                )}>
                                    {item.priority}
                                </span>
                            )
                        },
                        { header: "Owner Role", accessor: "owner" },
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
                        }
                    ]}
                />
            </div>
        </div>
    );
}

// Add cn import
import { cn } from "@/lib/utils";
