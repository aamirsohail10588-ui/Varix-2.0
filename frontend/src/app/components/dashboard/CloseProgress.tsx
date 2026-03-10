"use client";

import React from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    name: string;
    status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
}

export default function CloseProgress({ tasks, overallProgress }: { tasks: Task[], overallProgress: number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">March 2026 Close Status</h2>
                <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded">Day 3 of 5</span>
            </div>

            <div className="p-6 border-b border-slate-50">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Overall Progress</span>
                    <span className="text-sm font-bold text-slate-900">{overallProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {tasks.map((task) => (
                    <div key={task.id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            {task.status === "COMPLETED" ? (
                                <CheckCircle2 size={18} className="text-emerald-500" />
                            ) : task.status === "IN_PROGRESS" ? (
                                <Clock size={18} className="text-amber-500" />
                            ) : (
                                <Circle size={18} className="text-slate-300" />
                            )}
                            <span className={cn(
                                "text-sm font-medium",
                                task.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-700"
                            )}>
                                {task.name}
                            </span>
                        </div>
                        {task.status === "IN_PROGRESS" && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Active</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
