"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export interface NodeMetrics {
    label: string;
    value: string | number;
    status?: "success" | "warning" | "error" | "info";
}

interface ArchitectureNodeProps {
    id: string;
    title: string;
    icon: LucideIcon;
    state: "ACTIVE" | "IDLE" | "ERROR" | "PROCESSING";
    metrics: NodeMetrics[];
    lastActivity?: string;
    href: string;
    className?: string;
}

export default function ArchitectureNode({
    title,
    icon: Icon,
    state,
    metrics,
    lastActivity,
    href,
    className,
}: ArchitectureNodeProps) {
    const stateColors = {
        ACTIVE: "bg-emerald-500",
        IDLE: "bg-slate-300",
        ERROR: "bg-rose-500",
        PROCESSING: "bg-blue-500 animate-pulse",
    };

    const stateLabels = {
        ACTIVE: "Operational",
        IDLE: "Standby",
        ERROR: "Critical",
        PROCESSING: "Executing",
    };

    return (
        <Link href={href}>
            <div className={cn(
                "group relative bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-400 panel-transition cursor-pointer shadow-sm hover:shadow-md",
                className
            )}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-slate-50 rounded-md group-hover:bg-slate-100 panel-transition">
                            <Icon size={14} className="text-slate-600" />
                        </div>
                        <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-tight">{title}</h3>
                    </div>
                    <div className="flex items-center space-x-1.5 ">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{stateLabels[state]}</span>
                        <div className={cn("w-1.5 h-1.5 rounded-full", stateColors[state])} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {metrics.map((m, i) => (
                        <div key={i} className="space-y-0.5">
                            <span className="text-[9px] font-medium text-slate-400 uppercase block">{m.label}</span>
                            <span className={cn(
                                "text-[11px] font-bold tracking-tight",
                                m.status === "error" ? "text-rose-500" :
                                    m.status === "warning" ? "text-amber-500" :
                                        m.status === "success" ? "text-emerald-500" : "text-slate-700"
                            )}>
                                {m.value}
                            </span>
                        </div>
                    ))}
                </div>

                {lastActivity && (
                    <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center text-[9px] text-slate-400">
                            <Clock size={10} className="mr-1" />
                            <span>{lastActivity}</span>
                        </div>
                        <Activity size={10} className={cn(
                            "panel-transition",
                            state === "ACTIVE" || state === "PROCESSING" ? "text-emerald-400 animate-pulse" : "text-slate-200"
                        )} />
                    </div>
                )}
            </div>
        </Link>
    );
}
