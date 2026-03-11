"use client";

import React, { useEffect, useState } from "react";
import { useSystem } from "@/context/SystemContext";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import api from "@/lib/api";
import { FileText, Printer, CheckCircle2, Zap, Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
    const { loading, refresh } = useSystem();
    const [reports, setReports] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const fetchReports = async () => {
        setIsFetching(true);
        try {
            const response = await api.get("/tenants/audit-logs?action=REPORT_GENERATED");
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Gathering Report Evidence...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Reporting"
                actions={[
                    { label: "Design New Package", icon: FileText, onClick: () => console.log("Design..."), variant: "primary" },
                    { label: "Batch Print", icon: Printer, onClick: () => console.log("Print...") }
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
                    title="Regulatory Filings"
                    value="4"
                    status="info"
                    icon={FileText}
                />
                <MetricTile
                    title="Scheduled Runs"
                    value="12"
                    status="success"
                    icon={Clock}
                />
                <MetricTile
                    title="Data Freshness"
                    value="99.9"
                    status="success"
                    suffix="%"
                    icon={Zap}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Published Artifact History</span>
                </div>
                <OperationalTable
                    data={reports.map((l: any) => ({
                        id: l.id.substring(0, 8).toUpperCase(),
                        name: `Financial Summary - ${l.details?.format || "PDF"}`,
                        category: "Governance",
                        period: "March 2026",
                        date: new Date(l.createdAt).toLocaleDateString(),
                        user: l.user?.name || "System",
                        status: "Success"
                    }))}
                    columns={[
                        { header: "Artifact ID", accessor: "id", className: "font-mono" },
                        { header: "Report Label", accessor: "name", className: "font-bold text-slate-800" },
                        { header: "Domain", accessor: "category" },
                        { header: "Reporting Period", accessor: "period" },
                        { header: "Attribution", accessor: "user" },
                        {
                            header: "State",
                            accessor: (item: any) => (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                    {item.status}
                                </span>
                            )
                        },
                        {
                            header: "Actions",
                            accessor: () => (
                                <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                                    <History size={14} />
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
