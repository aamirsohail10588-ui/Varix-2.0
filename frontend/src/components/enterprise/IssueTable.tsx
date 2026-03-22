"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import OperationalTable from "./OperationalTable";

/**
 * Severity values must be UPPERCASE to match what governanceService normalises
 * from the DB (CRITICAL, BLOCKER, ERROR, HIGH, MEDIUM, LOW, WARNING).
 * Previous code used lowercase keys — icons never rendered.
 */
type Severity = "CRITICAL" | "BLOCKER" | "ERROR" | "HIGH" | "MEDIUM" | "LOW" | "WARNING";

interface Issue {
    id: string;
    title: string;
    severity: Severity | string;
    status: string;
    detectedAt: string;
}

const severityConfig: Record<string, { color: string; bg: string; icon: typeof AlertCircle }> = {
    CRITICAL: { color: "text-rose-700", bg: "bg-rose-50", icon: AlertCircle },
    BLOCKER: { color: "text-rose-700", bg: "bg-rose-50", icon: AlertCircle },
    ERROR: { color: "text-rose-600", bg: "bg-rose-50", icon: AlertCircle },
    HIGH: { color: "text-rose-500", bg: "bg-rose-50", icon: AlertTriangle },
    MEDIUM: { color: "text-amber-500", bg: "bg-amber-50", icon: AlertTriangle },
    LOW: { color: "text-blue-500", bg: "bg-blue-50", icon: Info },
    WARNING: { color: "text-amber-400", bg: "bg-amber-50", icon: AlertTriangle },
};

const fallbackConfig = { color: "text-slate-500", bg: "bg-slate-50", icon: Info };

export default function IssueTable({
    issues,
    onResolve,
}: {
    issues: Issue[];
    onResolve?: (id: string) => void;
}) {
    return (
        <OperationalTable
            data={issues}
            columns={[
                {
                    header: "Severity",
                    accessor: (item: Issue) => {
                        const key = (item.severity ?? "").toString().toUpperCase();
                        const cfg = severityConfig[key] ?? fallbackConfig;
                        const Icon = cfg.icon;
                        return (
                            <div
                                className={cn(
                                    "inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full",
                                    cfg.bg
                                )}
                            >
                                <Icon size={10} className={cfg.color} />
                                <span
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-tight",
                                        cfg.color
                                    )}
                                >
                                    {key}
                                </span>
                            </div>
                        );
                    },
                },
                {
                    header: "Detection / Violation",
                    accessor: "title" as keyof Issue,
                    className: "w-1/2 font-bold text-slate-800",
                },
                {
                    header: "State",
                    accessor: "status" as keyof Issue,
                    className: "uppercase tracking-widest text-[9px] font-black",
                },
                {
                    header: "Timestamp",
                    accessor: "detectedAt" as keyof Issue,
                    className: "text-slate-400",
                },
                {
                    header: "Actions",
                    accessor: (item: Issue) => (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onResolve?.(item.id);
                            }}
                            className="text-[10px] font-black text-primary-brand hover:underline uppercase tracking-widest"
                        >
                            Resolve
                        </button>
                    ),
                    className: "text-right",
                },
            ]}
        />
    );
}