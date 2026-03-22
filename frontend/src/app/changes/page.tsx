"use client";

import React, { useEffect, useState } from "react";
import { useSystemState } from "@/state/SystemStateProvider";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import apiClient from "@/services/apiClient";
import { RefreshCcw, FileText, History, Zap, ShieldCheck } from "lucide-react";

export default function ChangesPage() {
    const { loading } = useSystemState();
    const [changes, setChanges] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const fetchChanges = async () => {
        setIsFetching(true);
        try {
            const response = await apiClient.get("/changes/recent");
            setChanges(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch changes", error);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchChanges();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Tracing Financial Lineage...
                </span>
            </div>
        );
    }

    // Derive high-risk count from real change data instead of hardcoding "14"
    const highRiskCount = changes.filter(
        (c: any) =>
            c.risk_level === "HIGH" ||
            c.change_type === "OVERRIDE" ||
            c.change_type === "DELETION" ||
            c.change_type === "REVERSAL"
    ).length;

    const tableData = changes.map((c: any) => ({
        id: c.id.substring(0, 8).toUpperCase(),
        rawId: c.id,
        entity: c.entity_type || "System",
        account: c.entity_id || "Global Config",
        type: c.display_label || c.change_type || "—",
        impact: "Canonical Ledger",
        user: c.user?.name || c.actor || "System",
        date: new Date(c.detected_at).toLocaleDateString(),
        status: "Resolved",
    }));

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Changes"
                actions={[
                    {
                        label: "Refresh Lineage",
                        icon: RefreshCcw,
                        onClick: fetchChanges,
                        disabled: isFetching,
                        variant: "primary",
                    },
                    {
                        label: "Audit Log",
                        icon: FileText,
                        onClick: () => console.log("Audit..."),
                    },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                    title="Change Volume"
                    value={changes.length}
                    trend={8.2}
                    status="info"
                    suffix="ev"
                    icon={History}
                />
                <MetricTile
                    title="High-Risk Events"
                    value={highRiskCount}
                    status={highRiskCount > 0 ? "error" : "success"}
                    icon={Zap}
                />
                <MetricTile
                    title="Audit Persistence"
                    value="100"
                    status="success"
                    suffix="%"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Fetching"
                    value={isFetching ? "..." : "Live"}
                    status="success"
                    icon={RefreshCcw}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Global Lineage Stream
                    </span>
                </div>
                {tableData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No change events detected.
                    </div>
                ) : (
                    <OperationalTable
                        data={tableData}
                        columns={[
                            { header: "Lineage ID", accessor: "id" as any },
                            { header: "Entity", accessor: "entity" as any },
                            { header: "Reference", accessor: "account" as any },
                            {
                                header: "Action",
                                accessor: "type" as any,
                                className: "font-bold text-slate-800",
                            },
                            { header: "Impact Domain", accessor: "impact" as any },
                            { header: "Attribution", accessor: "user" as any },
                            {
                                header: "State",
                                accessor: (item: any) => (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-tighter">
                                        {item.status}
                                    </span>
                                ),
                            },
                        ]}
                    />
                )}
            </div>
        </div>
    );
}