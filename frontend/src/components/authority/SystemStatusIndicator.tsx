"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Server, Database } from "lucide-react";

interface Props {
    status: "HEALTHY" | "DEGRADED" | "CRITICAL";
    latency: number;
    uptime: string;
}

export default function SystemStatusIndicator({ status, latency, uptime }: Props) {
    const statusConfig = {
        HEALTHY: {
            color: "text-emerald-500",
            bg: "bg-emerald-500",
            label: "System Nominal",
            icon: ShieldCheck
        },
        DEGRADED: {
            color: "text-amber-500",
            bg: "bg-amber-500",
            label: "Latent Load",
            icon: Server
        },
        CRITICAL: {
            color: "text-rose-500",
            bg: "bg-rose-500",
            label: "Critical Halt",
            icon: Database
        }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className="flex items-center space-x-6 px-4 py-1.5 bg-slate-50/50 rounded-full border border-slate-100">
            <div className="flex items-center space-x-2">
                <div className={cn("relative flex items-center justify-center")}>
                    <div className={cn("absolute w-full h-full rounded-full opacity-20 animate-ping", config.bg)} />
                    <div className={cn("w-1.5 h-1.5 rounded-full relative z-10", config.bg)} />
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-tight", config.color)}>
                    {config.label}
                </span>
            </div>

            <div className="h-3 w-px bg-slate-200" />

            <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Latency</span>
                    <span className="text-[10px] font-bold text-slate-600 leading-none">{latency}ms</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Uptime</span>
                    <span className="text-[10px] font-bold text-slate-600 leading-none">{uptime}</span>
                </div>
            </div>

            <Icon size={12} className="text-slate-300" />
        </div>
    );
}
