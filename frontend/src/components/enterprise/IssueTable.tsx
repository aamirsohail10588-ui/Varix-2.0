"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import OperationalTable from "./OperationalTable";

interface Issue {
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    status: string;
    detectedAt: string;
}

export default function IssueTable({ issues, onResolve }: { issues: Issue[], onResolve?: (id: string) => void }) {
    const severityConfig = {
        critical: { color: "text-rose-600 bg-rose-50", icon: AlertCircle },
        high: { color: "text-rose-500 bg-rose-50", icon: AlertTriangle },
        medium: { color: "text-amber-500 bg-amber-50", icon: AlertTriangle },
        low: { color: "text-blue-500 bg-blue-50", icon: Info }
    };

    return (
        <OperationalTable
            data={issues}
            columns={[
                {
                    header: "Severity",
                    accessor: (item) => {
                        const config = severityConfig[item.severity];
                        const Icon = config.icon;
                        return (
                            <div className={cn("inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full", config.color)}>
                                <Icon size={10} />
                                <span className="text-[9px] font-black uppercase tracking-tight">{item.severity}</span>
                            </div>
                        );
                    }
                },
                { header: "Detection / Violation", accessor: "title", className: "w-1/2 font-bold text-slate-800" },
                { header: "State", accessor: "status", className: "uppercase tracking-widest text-[9px] font-black" },
                { header: "Timestamp", accessor: "detectedAt", className: "text-slate-400" },
                {
                    header: "Actions",
                    accessor: (item) => (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResolve?.(item.id); }}
                            className="text-[10px] font-black text-primary-brand hover:underline uppercase tracking-widest"
                        >
                            Resolve
                        </button>
                    ),
                    className: "text-right"
                }
            ]}
        />
    );
}
