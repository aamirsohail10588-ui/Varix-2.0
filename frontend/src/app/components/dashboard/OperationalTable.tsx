"use client";

import React from "react";
import { ChevronRight, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
    header: string;
    accessor: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface OperationalTableProps {
    columns: Column[];
    data: any[];
    onRowClick: (row: any) => void;
}

export default function OperationalTable({ columns, data, onRowClick }: OperationalTableProps) {

    const PAGE_SIZE = 50;
    const [page, setPage] = React.useState(1);

    const start = (page - 1) * PAGE_SIZE;
    const paginatedData = data.slice(start, start + PAGE_SIZE);
    const getStatusStyles = (status: string) => {
        const s = (status || "").toLowerCase();
        if (s.includes("fail") || s.includes("error") || s.includes("mismatch") || s.includes("violation")) {
            return "bg-red-50 text-red-600 border-red-100";
        }
        if (s.includes("pending") || s.includes("review") || s.includes("warning")) {
            return "bg-amber-50 text-amber-600 border-amber-100";
        }
        if (s.includes("success") || s.includes("resolved") || s.includes("active") || s.includes("completed")) {
            return "bg-emerald-50 text-emerald-600 border-emerald-100";
        }
        return "bg-slate-50 text-slate-600 border-slate-100";
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className="px-6 py-4 text-[10px] uppercase font-heavy text-slate-400 tracking-widest"
                            >
                                {col.header}
                            </th>
                        ))}
                        <th className="px-6 py-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-6 py-20 text-center">
                                <p className="text-slate-400 text-sm font-medium">No operational records found for the selected filters.</p>
                            </td>
                        </tr>
                    ) : (
                        paginatedData.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                onClick={() => onRowClick(row)}
                                className="hover:bg-primary-brand/[0.02] cursor-pointer transition-all group"
                            >
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4">
                                        {col.render ? (
                                            col.render(row[col.accessor], row)
                                        ) : (
                                            <span className={cn(
                                                "text-sm font-medium",
                                                col.accessor === "status" ? cn("text-[10px] font-bold px-2 py-1 rounded-full border", getStatusStyles(row[col.accessor])) : "text-slate-700"
                                            )}>
                                                {row[col.accessor]}
                                            </span>
                                        )}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-brand transition-colors" />
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <div className="flex justify-between items-center px-6 py-4 border-t bg-slate-50 text-sm">

                <span className="text-slate-500">
                    Showing {start + 1}–{Math.min(start + PAGE_SIZE, data.length)} of {data.length}
                </span>

                <div className="flex gap-2">

                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                        Previous
                    </button>

                    <button
                        disabled={start + PAGE_SIZE >= data.length}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                        Next
                    </button>

                </div>

            </div>

        </div>
    );
}
