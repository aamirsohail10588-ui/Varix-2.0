"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ERPConnector } from "@/services/erpService";

interface StatusCardProps {
    connector: ERPConnector;
    onSync: () => void;
    isSyncing?: boolean;
}

/**
 * DB status values are uppercase: ACTIVE, INACTIVE, SYNCING, ERROR, CONNECTED, DISCONNECTED.
 * Previous config used lowercase keys — status badge always fell through to default.
 */
const statusConfig: Record<
    string,
    { icon: typeof CheckCircle2; color: string; bg: string }
> = {
    ACTIVE: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    CONNECTED: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    SYNCING: { icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-50" },
    INACTIVE: { icon: XCircle, color: "text-slate-400", bg: "bg-slate-50" },
    DISCONNECTED: { icon: XCircle, color: "text-slate-400", bg: "bg-slate-50" },
    ERROR: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" },
};

const fallbackConfig = { icon: XCircle, color: "text-slate-400", bg: "bg-slate-50" };

export default function ConnectorStatusCard({ connector, onSync, isSyncing }: StatusCardProps) {
    const statusKey = (connector.status ?? "").toString().toUpperCase();
    const cfg = statusConfig[statusKey] ?? fallbackConfig;
    const StatusIcon = cfg.icon;

    // connector_type is the real field (e.g. "ZOHO_CONNECTOR", "TALLY_CONNECTOR")
    const displayName = connector.connector_type
        .replace(/_CONNECTOR$/, "")
        .replace(/_/g, " ");

    return (
        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                        <Database size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                            {displayName}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {connector.sync_frequency}
                        </span>
                    </div>
                </div>
                <div
                    className={cn(
                        "px-2 py-0.5 rounded-full flex items-center space-x-1.5",
                        cfg.bg
                    )}
                >
                    <StatusIcon size={10} className={cfg.color} />
                    <span
                        className={cn(
                            "text-[9px] font-black uppercase tracking-tight",
                            cfg.color
                        )}
                    >
                        {statusKey}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                        Last Sync
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                        {connector.last_sync_at
                            ? new Date(connector.last_sync_at).toLocaleDateString()
                            : "Never"}
                    </span>
                </div>
                <div className="space-y-0.5 text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                        Frequency
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                        {connector.sync_frequency ?? "—"}
                    </span>
                </div>
            </div>

            <button
                onClick={onSync}
                disabled={isSyncing || statusKey === "SYNCING"}
                className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-[10px] font-black text-slate-600 uppercase tracking-widest rounded-md transition-colors"
            >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                <span>{isSyncing ? "Syncing..." : "Trigger Resync"}</span>
            </button>
        </div>
    );
}