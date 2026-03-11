"use client";

import React, { useState } from "react";
import { LucideIcon, Download, Printer, Share2 } from "lucide-react";
import StatCard from "./StatCard";
import FilterBar from "./FilterBar";
import OperationalTable from "./OperationalTable";
import ContextPanel from "./ContextPanel";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";
import { Loader2 } from "lucide-react";

interface Metric {
    title: string;
    value: string | number;
    trend?: number;
    status?: "success" | "warning" | "error" | "info";
    suffix?: string;
}

interface ModuleWorkspaceProps {
    title: string;
    description: string;
    metrics: Metric[];
    tableColumns: any[];
    tableData: any[];
    onRowClick?: (row: any) => void;
    filters?: any[];
}

export default function ModuleWorkspace({
    title,
    description,
    metrics,
    tableColumns,
    tableData,
    onRowClick,
    filters = []
}: ModuleWorkspaceProps) {
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const handleRowClick = (row: any) => {
        setSelectedRow(row);
        setIsPanelOpen(true);
        if (onRowClick) onRowClick(row);
    };

    const handleExport = async (format: "CSV" | "XLSX" | "PDF" = "CSV") => {
        setIsExporting(true);
        try {
            // Mapping titles to backend endpoints
            const endpointMap: Record<string, string> = {
                "Financial Integrity": "/controls/export",
                "General Ledger": "/ledger/export",
                "Governance Controls": "/controls/export",
                "Financial Changes": "/changes/export"
            };

            const endpoint = endpointMap[title] || "/ledger/export";
            const response = await apiClient.get(`${endpoint}?format=${format}`, {
                responseType: "blob"
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `VARIX_${title.replace(/ /g, "_")}_Export.${format.toLowerCase()}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed", error);
            alert("Export failed. Please ensure the backend services are reachable.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            const response = await apiClient.post("/reports/generate", { format: "PDF" }, {
                responseType: "blob"
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `VARIX_Summary_Report_${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Report generation failed", error);
            alert("Report generation failed.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
                    <p className="text-slate-500 mt-1">{description}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white"
                        onClick={() => handleExport("XLSX")}
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white"
                        onClick={() => {
                            const link = `${window.location.origin}${window.location.pathname}?tenantId=${localStorage.getItem("activeTenantId")}`;
                            navigator.clipboard.writeText(link);
                            alert("Secure, tenant-scoped share link copied to clipboard!");
                        }}
                    >
                        <Share2 size={16} className="mr-2" />
                        Share
                    </Button>
                    <Button
                        size="sm"
                        className="bg-primary-brand text-white"
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                    >
                        {isGeneratingReport ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {metrics.map((metric, idx) => (
                    <StatCard key={idx} {...metric} />
                ))}
            </div>

            {/* Operational Controls & Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                <FilterBar />

                <OperationalTable
                    columns={tableColumns}
                    data={tableData}
                    onRowClick={handleRowClick}
                />

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>Showing {tableData.length} records detected in the current period</span>
                    <div className="flex items-center space-x-4">
                        <button className="hover:text-primary-brand transition-colors">Previous</button>
                        <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded bg-primary-brand text-white flex items-center justify-center font-bold">1</span>
                            <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer">2</span>
                            <span className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer">3</span>
                        </div>
                        <button className="hover:text-primary-brand transition-colors">Next</button>
                    </div>
                </div>
            </div>

            {/* Investigation Panel */}
            <ContextPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                data={selectedRow}
            />
        </div>
    );
}
