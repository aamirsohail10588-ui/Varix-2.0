"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";

interface LayerStatusCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    status: "ACTIVE" | "PROCESSING" | "IDLE" | "ERROR";
    metrics: { label: string; value: string | number; color?: string }[];
    href: string;
    className?: string;
}

export default function LayerStatusCard({
    title,
    description,
    icon: Icon,
    status,
    metrics,
    href,
    className
}: LayerStatusCardProps) {
    const statusConfigs = {
        ACTIVE: { color: "bg-emerald-500", label: "Operational" },
        PROCESSING: { color: "bg-blue-500 animate-pulse", label: "Executing" },
        IDLE: { color: "bg-slate-300", label: "Standby" },
        ERROR: { color: "bg-rose-500", label: "Critical" }
    };

    const config = statusConfigs[status];

    return (
        <Link href={href}>
            <div className={cn(
                "group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 panel-transition cursor-pointer shadow-sm relative overflow-hidden",
                className
            )}>
                {/* Status Indicator Bar */}
                <div className={cn("absolute top-0 left-0 w-1 h-full", config.color)} />

                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 panel-transition">
                            <Icon size={18} className="text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{title}</h3>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">{description}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center space-x-1.5 mb-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{config.label}</span>
                            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
                        </div>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 panel-transition" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {metrics.map((m, i) => (
                        <div key={i} className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{m.label}</span>
                            <span className={cn("text-xs font-black tracking-tight", m.color || "text-slate-800")}>
                                {m.value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                        <Activity size={10} className={cn(
                            "panel-transition",
                            status === "ACTIVE" || status === "PROCESSING" ? "text-emerald-400" : "text-slate-200"
                        )} />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Live Pulse Tracking</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
