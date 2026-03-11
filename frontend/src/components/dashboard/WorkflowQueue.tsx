"use client";

import React from "react";
import { Clock, User as UserIcon, MoreVertical, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    priority: "High" | "Medium" | "Low";
    owner: string;
    dueDate: string;
    status: "Pending" | "In Review" | "Action Required";
}

export default function WorkflowQueue({ tasks }: { tasks: Task[] }) {
    const getPriorityColor = (p: string) => {
        switch (p) {
            case "High": return "bg-red-50 text-red-600 border-red-100";
            case "Medium": return "bg-amber-50 text-amber-600 border-amber-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Financial Workflow Queue</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">Task Title</th>
                            <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">Priority</th>
                            <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">Assigned To</th>
                            <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">Due Date</th>
                            <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400">Status</th>
                            <th className="px-6 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{task.title}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", getPriorityColor(task.priority))}>
                                        {task.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                            <UserIcon size={12} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-600">{task.owner}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                                        <Clock size={12} />
                                        <span>{task.dueDate}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded",
                                        task.status === "Action Required" ? "bg-red-50 text-red-600" : task.status === "In Review" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"
                                    )}>
                                        {task.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 text-slate-300 hover:text-slate-600 group-hover:bg-white rounded transition-all">
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-3 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-medium text-slate-400">Showing 3 of 12 active tasks</span>
                <button className="text-[10px] font-bold text-primary-brand hover:underline">View All Tasks</button>
            </div>
        </div>
    );
}
