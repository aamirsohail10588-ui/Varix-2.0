"use client";

import React, { useEffect, useState } from "react";
import { useSystem } from "@/context/SystemContext";
import SystemActionBar from "@/components/enterprise/SystemActionBar";
import MetricTile from "@/components/enterprise/MetricTile";
import OperationalTable from "@/components/enterprise/OperationalTable";
import api from "@/lib/api";
import { RefreshCcw, FileText, History, Zap } from "lucide-react";

export default function ChangesPage() {
    const { loading, refresh } = useSystem();
    const [changes, setChanges] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const fetchChanges = async () => {
        setIsFetching(true);
        try {
            const response = await api.get("/changes/recent");
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Tracing Financial Lineage...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SystemActionBar
                title="Financial Changes"
                actions={[
                    { label: "Refresh Lineage", icon: RefreshCcw, onClick: fetchChanges, disabled: isFetching },
                    { label: "Audit Log", icon: FileText, onClick: () => console.log("Audit...") }
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
                    title="High-Risk Variance"
                    value="14"
                    trend={-12.5}
                    status="error"
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
                    title="Avg. Resolution"
                    value="4.2"
                    trend={-2.1}
                    status="success"
                    suffix="hrs"
                    icon={RefreshCcw}
                />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Lineage Stream</span>
                </div>
                <OperationalTable
                    data={changes.map((c: any) => ({
                        id: c.id.substring(0, 8).toUpperCase(),
                        entity: c.entity_type || "System",
                        account: c.entity_id || "Global Config",
                        type: c.display_label || c.change_type,
                        impact: "Canonical Ledger",
                        user: "System",
                        date: new Date(c.detected_at).toLocaleDateString(),
                        status: "Resolved"
                    }))}
                    columns={[
                        { header: "Lineage ID", accessor: "id" },
                        { header: "Entity", accessor: "entity" },
                        { header: "Reference", accessor: "account" },
                        { header: "Action", accessor: "type", className: "font-bold text-slate-800" },
                        { header: "Impact Domain", accessor: "impact" },
                        { header: "Attribution", accessor: "user" },
                        {
                            header: "State",
                            accessor: (item: any) => (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-tighter">
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

// Add ShieldCheck import
import { ShieldCheck } from "lucide-react";
