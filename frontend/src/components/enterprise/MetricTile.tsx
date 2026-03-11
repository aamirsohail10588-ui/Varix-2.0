"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface MetricTileProps {
    title: string;
    value: string | number;
    trend?: number;
    status?: "success" | "warning" | "error" | "info";
    suffix?: string;
    icon?: LucideIcon;
    className?: string;
}

export default function MetricTile({
    title,
    value,
    trend,
    status = "info",
    suffix,
    icon: Icon,
    className
}: MetricTileProps) {
    const statusColors = {
        success: "text-emerald-500 bg-emerald-50",
        warning: "text-amber-500 bg-amber-50",
        error: "text-rose-500 bg-rose-50",
        info: "text-blue-500 bg-blue-50"
    };

    return (
        <div className={cn(
            "p-3 bg-white border border-slate-100 rounded-lg shadow-sm flex flex-col justify-between h-[100px]",
            className
        )}>
            <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {title}
                </span>
                {Icon && <Icon size={12} className="text-slate-300" />}
            </div>

            <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                    {value}
                </span>
                {suffix && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{suffix}</span>
                )}
            </div>

            <div className="flex items-center justify-between mt-auto">
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center text-[10px] font-bold",
                        trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-slate-400"
                    )}>
                        {trend > 0 ? <ArrowUpRight size={10} className="mr-0.5" /> :
                            trend < 0 ? <ArrowDownRight size={10} className="mr-0.5" /> :
                                <Minus size={10} className="mr-0.5" />}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
                <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase", statusColors[status])}>
                    {status}
                </div>
            </div>
        </div>
    );
}
