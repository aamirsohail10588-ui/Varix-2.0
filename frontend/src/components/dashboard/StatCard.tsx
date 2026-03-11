"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    trend?: number; // percentage change
    status?: "success" | "warning" | "error" | "info";
    prefix?: string;
    suffix?: string;
}

export default function StatCard({ title, value, trend, status = "info", prefix, suffix }: StatCardProps) {
    const isPositive = trend && trend > 0;
    const isNegative = trend && trend < 0;

    const statusColors = {
        success: "text-emerald-500",
        warning: "text-amber-500",
        error: "text-red-500",
        info: "text-primary-brand",
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
                <div className={cn("p-2 rounded-lg bg-slate-50", statusColors[status])}>
                    {/* Dynamic icon could go here based on status */}
                </div>
            </div>

            <div className="flex items-baseline space-x-1">
                {prefix && <span className="text-xl font-medium text-slate-400">{prefix}</span>}
                <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
                {suffix && <span className="text-lg font-medium text-slate-400">{suffix}</span>}
            </div>

            <div className="mt-4 flex items-center space-x-2">
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center text-xs font-bold px-2 py-1 rounded-full",
                        isPositive ? "bg-emerald-50 text-emerald-600" : isNegative ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                    )}>
                        {isPositive ? <TrendingUp size={12} className="mr-1" /> : isNegative ? <TrendingDown size={12} className="mr-1" /> : <Minus size={12} className="mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
                <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
            </div>
        </div>
    );
}
