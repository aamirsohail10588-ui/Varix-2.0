"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import apiClient from "@/services/apiClient";
import { FileText, Printer, CheckCircle2, Zap, Clock, History } from "lucide-react";

export default function ReportsPage() {
    const { loading } = useSystemState();
    const [reports, setReports] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchReports = async () => {
        setIsFetching(true);
        try {
            // Audit logs with REPORT_GENERATED action represent generated reports
            const response = await apiClient.get(
                "/tenants/audit-logs?action=REPORT_GENERATED"
            );
            setReports(response.data.logs || []);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            const response = await apiClient.post(
                "/reports/generate",
                { format: "PDF" },
                { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `VARIX_Report_${new Date().toISOString().split("T")[0]}.pdf`;
            a.click();
            // Refresh report list after generation
            await fetchReports();
        } catch (err) {
            console.error("Report generation failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Gathering Report Evidence...
                </span>
            </div>
        );
    }

    const tableData = reports.map((l: any) => ({
        id: l.id.substring(0, 8).toUpperCase(),
        name: `Financial Summary — ${l.details?.format || "PDF"}`,
        category: "Governance",
        period: l.details?.period || "—",
        date: new Date(l.createdAt).toLocaleDateString(),
        user: l.user?.name || "System",
        status: "Success",
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Reporting"
                actions={[
                    {
                        label: isGenerating ? "Generating..." : "Generate Report",
                        icon: FileText,
                        onClick: handleGenerateReport,
                        variant: "primary",
                    },
                    {
                        label: "Refresh",
                        icon: Printer,
                        onClick: fetchReports,
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Generated Reports"
                    value={reports.length}
                    trend={15.4}
                    status="success"
                    icon={CheckCircle2}
                />
                <MetricTile
                    title="Fetching"
                    value={isFetching ? "..." : "Ready"}
                    status="info"
                    icon={FileText}
                />
                <MetricTile
                    title="Last Generated"
                    value={
                        reports.length > 0
                            ? new Date(reports[0].createdAt).toLocaleDateString()
                            : "—"
                    }
                    status="success"
                    icon={Clock}
                />
                <MetricTile
                    title="Data Freshness"
                    value="Live"
                    status="success"
                    icon={Zap}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Published Artifact History
                    </span>
                </div>
                {tableData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No reports generated yet. Click Generate Report to create one.
                    </div>
                ) : (
                    <OperationalTable
                        data={tableData}
                        columns={[
                            {
                                header: "Artifact ID",
                                accessor: "id" as any,
                                className: "font-mono",
                            },
                            {
                                header: "Report Label",
                                accessor: "name" as any,
                                className: "font-bold text-slate-800",
                            },
                            { header: "Domain", accessor: "category" as any },
                            { header: "Reporting Period", accessor: "period" as any },
                            { header: "Attribution", accessor: "user" as any },
                            {
                                header: "State",
                                accessor: (item: any) => (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                        {item.status}
                                    </span>
                                ),
                            },
                            {
                                header: "Actions",
                                accessor: () => (
                                    <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                                        <History size={14} />
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