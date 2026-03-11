"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ERPConnector } from "@/services/erpService";

interface StatusCardProps {
    connector: ERPConnector;
    onSync: () => void;
}

export default function ConnectorStatusCard({
    connector,
    onSync
}: StatusCardProps) {
    const statusConfig = {
        active: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
        inactive: { icon: XCircle, color: "text-slate-400", bg: "bg-slate-50" },
        error: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" }
    };

    const config = statusConfig[connector.status] || statusConfig.inactive;
    const StatusIcon = config.icon;

    return (
        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm hover:border-slate-300 panel-transition">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                        <Database size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{connector.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{connector.connector_type}</span>
                    </div>
                </div>
                <div className={cn("px-2 py-0.5 rounded-full flex items-center space-x-1.5", config.bg)}>
                    <StatusIcon size={10} className={config.color} />
                    <span className={cn("text-[9px] font-black uppercase tracking-tight", config.color)}>{connector.status}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Last Sync</span>
                    <span className="text-xs font-bold text-slate-700">
                        {connector.last_sync_at ? new Date(connector.last_sync_at).toLocaleDateString() : "Never"}
                    </span>
                </div>
                <div className="space-y-0.5 text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Rows Processed</span>
                    <span className="text-xs font-bold text-slate-700">{connector.rows_processed?.toLocaleString() || 0}</span>
                </div>
            </div>

            <button
                onClick={onSync}
                className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-50 hover:bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-widest rounded-md panel-transition"
            >
                <RefreshCw size={12} />
                <span>Trigger Resync</span>
            </button>
        </div>
    );
}
