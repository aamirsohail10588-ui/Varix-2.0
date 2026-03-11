"use client";

import React from "react";
import { Sparkles, ArrowUpRight, BrainCircuit } from "lucide-react";

interface Insight {
    id: string;
    category: string;
    text: string;
    impact: "positive" | "negative" | "neutral";
}

export default function InsightsCard({ insights }: { insights: Insight[] }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <BrainCircuit size={20} className="text-primary-brand" />
                    <h2 className="font-bold text-slate-800">AI Narrative Insights</h2>
                </div>
                <Sparkles size={16} className="text-amber-400 animate-pulse" />
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                {insights.map((insight) => (
                    <div key={insight.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 group transition-all hover:border-primary-brand/30 hover:bg-white cursor-pointer relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-brand">{insight.category}</span>
                            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-primary-brand" />
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            {insight.text}
                        </p>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-brand/10 group-hover:bg-primary-brand" />
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Generate Deep-Dive PDF
                </button>
            </div>
        </div>
    );
}
