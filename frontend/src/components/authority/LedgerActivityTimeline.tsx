"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface DataPoint {
    time: string;
    volume: number;
}

export default function LedgerActivityTimeline({ data }: { data: DataPoint[] }) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 h-[240px] shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ledger Activity Timeline</h3>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-bold text-slate-500">TPS</span>
                    </div>
                </div>
            </div>

            <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="ledgerColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            hide
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #f1f5f9',
                                borderRadius: '8px',
                                fontSize: '10px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="volume"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#ledgerColor)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
