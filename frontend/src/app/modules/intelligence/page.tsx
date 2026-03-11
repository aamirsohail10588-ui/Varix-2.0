"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { BrainCircuit, Zap, BarChart3, TrendingUp, ShieldCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntelligencePage() {
    const { integrity, anomalies, loading, refresh } = useSystemState();

    if (loading || !integrity || !anomalies) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Synthesizing Intelligence...</span>
            </div>
        );
    }

    const insights = [
        { id: "INT-901", type: "Benchmark Variance", impact: "$ 12,400", confidence: 92, status: "Active" },
        { id: "INT-902", type: "Anomaly Detection", impact: "$ 4,200", confidence: 85, status: "In Review" },
        { id: "INT-903", type: "Tax Risk Outlier", impact: "High", confidence: 78, status: "Action Required" },
    ];

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Intelligence"
                actions={[
                    { label: "Generate Insights", icon: BrainCircuit, onClick: refresh, variant: "primary" },
                    { label: "Industry Benchmark", icon: BarChart3, onClick: () => console.log("Benchmark...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Intelligence Score"
                    value={integrity.final_score.toFixed(1)}
                    trend={2.1}
                    status="success"
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Insight Velocity"
                    value="12"
                    status="info"
                    suffix="/mo"
                    icon={TrendingUp}
                />
                <MetricTile
                    title="Journal Risk"
                    value={anomalies.journal_risk.toFixed(1)}
                    status={anomalies.journal_risk < 40 ? "success" : "warning"}
                    icon={Search}
                />
                <MetricTile
                    title="ROI Projection"
                    value="1.2"
                    status="success"
                    suffix="M"
                    icon={Zap}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autonomous Insight Stream</span>
                </div>
                <OperationalTable
                    data={insights}
                    columns={[
                        { header: "Insight Node", accessor: "type", className: "font-bold text-slate-800" },
                        { header: "Estimated Impact", accessor: "impact" },
                        {
                            header: "Confidence Score",
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
                            header: "Operational State",
                            accessor: (item: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                    item.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {item.status}
                                </span>
                            )
                        },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">Detailed Audit</button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}
