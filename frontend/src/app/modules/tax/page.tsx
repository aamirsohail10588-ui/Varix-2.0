"use client";

import React from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Scale, ShieldCheck, AlertCircle, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TaxPage() {
    const { integrity, anomalies, governance, loading, refresh } = useSystemState();

    if (loading || !anomalies) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Calculating Tax Positioning...</span>
            </div>
        );
    }

    const taxViolations = governance.violations.filter(v =>
        v.type.toLowerCase().includes("tax") ||
        v.type.toLowerCase().includes("gst") ||
        v.type.toLowerCase().includes("vat")
    );

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Tax Governance"
                actions={[
                    { label: "Trigger Tax Audit", icon: ShieldCheck, onClick: refresh, variant: "primary" },
                    { label: "Generate Tax Package", icon: FileText, onClick: () => console.log("Tax Pkg...") }
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Effective Tax Rate"
                    value="22.4"
                    trend={-0.5}
                    status="info"
                    suffix="%"
                    icon={Activity}
                />
                <MetricTile
                    title="Tax Risk Vector"
                    value={anomalies.tax_risk.toFixed(1)}
                    status={anomalies.tax_risk > 30 ? "error" : "success"}
                    icon={Scale}
                />
                <MetricTile
                    title="Validation Gaps"
                    value={taxViolations.length}
                    status={taxViolations.length > 0 ? "error" : "success"}
                    icon={AlertCircle}
                />
                <MetricTile
                    title="Provisioning Health"
                    value="98.2"
                    trend={0.8}
                    status="success"
                    suffix="%"
                    icon={ShieldCheck}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jurisdictional Tax Lineage</span>
                </div>
                <OperationalTable
                    data={taxViolations.map(v => ({
                        id: v.id,
                        entity: "Global Entity",
                        type: v.type,
                        ref: `TAX-${v.id.substring(0, 4)}`,
                        status: v.status,
                        severity: v.severity
                    }))}
                    columns={[
                        { header: "Entity Domain", accessor: "entity" },
                        { header: "Control Node", accessor: "type", className: "font-bold text-slate-800" },
                        { header: "System Reference", accessor: "ref" },
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
                            header: "Status",
                            accessor: (item: any) => (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                    {item.status}
                                </span>
                            )
                        },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="text-[9px] font-black text-primary-brand uppercase tracking-widest">Audit Evidence</button>
                            ),
                            className: "text-right"
                        }
                    ]}
                />
            </div>
        </div>
    );
}
