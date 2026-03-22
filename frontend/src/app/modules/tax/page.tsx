"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import { Scale, ShieldCheck, AlertCircle, FileText, Activity } from "lucide-react";
import apiClient from "@/services/apiClient";

export default function TaxPage() {
    const { integrity, anomalies, governance, loading, refresh } = useSystemState();

    if (loading || !anomalies) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Calculating Tax Positioning...
                </span>
            </div>
        );
    }

    // Severity is now uppercase from governanceService
    const taxViolations = governance.violations.filter(
        (v) =>
            v.controlSpec.name.toLowerCase().includes("tax") ||
            v.controlSpec.name.toLowerCase().includes("gst") ||
            v.controlSpec.name.toLowerCase().includes("vat") ||
            v.controlSpec.name.toLowerCase().includes("tds")
    );

    // Provisioning health derived from integrity component (no separate endpoint)
    const provisioningHealth = integrity
        ? integrity.integrity_component.toFixed(1)
        : "—";

    const handleTaxAudit = async () => {
        try {
            const period = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
            await apiClient.post(`/analytics/calculate-risk/${period}`);
            await refresh();
        } catch (err) {
            console.error("Tax audit failed:", err);
        }
    };

    const handleGenerateTaxPackage = async () => {
        try {
            const response = await apiClient.post(
                "/reports/generate",
                { format: "PDF" },
                { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "VARIX_Tax_Package.pdf";
            a.click();
        } catch (err) {
            console.error("Tax package generation failed:", err);
        }
    };

    const tableData = taxViolations.map((v) => ({
        id: v.id,
        entity: "Tenant Entity",
        type: v.controlSpec.name,
        ref: `TAX-${v.id.substring(0, 4).toUpperCase()}`,
        status: v.status ?? "OPEN",
        severity: v.severity.toUpperCase(),
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Tax Governance"
                actions={[
                    {
                        label: "Trigger Tax Audit",
                        icon: ShieldCheck,
                        onClick: handleTaxAudit,
                        variant: "primary",
                    },
                    {
                        label: "Generate Tax Package",
                        icon: FileText,
                        onClick: handleGenerateTaxPackage,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Tax Risk Vector"
                    value={anomalies.tax_risk.toFixed(1)}
                    status={anomalies.tax_risk > 30 ? "error" : "success"}
                    icon={Scale}
                />
                <MetricTile
                    title="Tax Violations"
                    value={taxViolations.length}
                    status={taxViolations.length > 0 ? "error" : "success"}
                    icon={AlertCircle}
                />
                <MetricTile
                    title="Provisioning Health"
                    value={provisioningHealth}
                    status={
                        integrity && integrity.integrity_component >= 90
                            ? "success"
                            : "warning"
                    }
                    suffix="pts"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Compliance Score"
                    value={anomalies.compliance_score.toFixed(1)}
                    status={anomalies.compliance_score >= 80 ? "success" : "warning"}
                    icon={Activity}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Jurisdictional Tax Lineage
                    </span>
                </div>
                {tableData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No tax violations detected. System nominal.
                    </div>
                ) : (
                    <OperationalTable
                        data={tableData}
                        columns={[
                            { header: "Entity Domain", accessor: "entity" as any },
                            {
                                header: "Control Node",
                                accessor: "type" as any,
                                className: "font-bold text-slate-800",
                            },
                            { header: "System Reference", accessor: "ref" as any },
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
                                header: "Status",
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
                                        Audit Evidence
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