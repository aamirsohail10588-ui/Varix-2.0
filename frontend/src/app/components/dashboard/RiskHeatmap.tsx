"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskIndicator {
    name: string;
    score: number; // 0 to 100
    previousScore: number;
}

export default function RiskHeatmap({ risks }: { risks: RiskIndicator[] }) {
    const getGradient = (score: number) => {
        if (score > 70) return "bg-red-500 shadow-red-200";
        if (score > 40) return "bg-amber-500 shadow-amber-200";
        return "bg-emerald-500 shadow-emerald-200";
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800">Financial Risk Heatmap</h2>
                <Info size={16} className="text-slate-300 cursor-help" />
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
                {risks.map((risk) => (
                    <div key={risk.name} className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-semibold text-slate-600 uppercase tracking-tight">{risk.name}</span>
                            <span className="text-sm font-bold text-slate-900">{risk.score}/100</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                                className={cn("h-full panel-transition rounded-full shadow-lg", getGradient(risk.score))}
                                style={{ width: `${risk.score}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-medium">
                            <span className="text-slate-400">Previous: {risk.previousScore}</span>
                            <span className={cn(
                                "flex items-center",
                                risk.score > risk.previousScore ? "text-red-500" : "text-emerald-500"
                            )}>
                                {risk.score > risk.previousScore ? "↑ Deteriorating" : "↓ Improving"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center p-3 bg-red-50/50 rounded-lg">
                <AlertTriangle size={18} className="text-red-500 mr-3 shrink-0" />
                <p className="text-xs text-red-700 leading-tight">
                    <strong>Urgent:</strong> Elevated Journal Risk detected in Western Region entity. Audit required.
                </p>
            </div>
        </div>
    );
}
