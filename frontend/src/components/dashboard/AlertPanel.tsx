"use client";

import React from "react";
import { AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";

interface Alert {
    id: string;
    type: string;
    amount: string;
    status: string;
    user: string;
    severity: "high" | "medium" | "low";
}

export default function AlertPanel({ alerts }: { alerts: Alert[] }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-2">
                    <ShieldAlert size={20} className="text-red-500" />
                    <h2 className="font-bold text-slate-800">Critical Financial Alerts</h2>
                </div>
                <button className="text-xs font-bold text-primary-brand hover:underline flex items-center">
                    View All <ArrowRight size={14} className="ml-1" />
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                    <div key={alert.id} className="px-6 py-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{alert.type}</p>
                                    <p className="text-[10px] text-slate-400">Assigned to: <span className="text-slate-600 font-medium">{alert.user}</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{alert.amount}</p>
                                <p className="text-[10px] font-bold uppercase text-red-500 tracking-wider bg-red-50 px-1.5 py-0.5 rounded">{alert.status}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
