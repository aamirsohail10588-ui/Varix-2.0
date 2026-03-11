"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}

interface OperationalTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    className?: string;
}

export default function OperationalTable<T extends { id: string | number }>({
    data,
    columns,
    onRowClick,
    className
}: OperationalTableProps<T>) {
    return (
        <div className={cn("overflow-x-auto border border-slate-100 rounded-lg bg-white shadow-sm", className)}>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        {columns.map((col, i) => (
                            <th key={i} className={cn(
                                "px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                                col.className
                            )}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {data.map((item) => (
                        <tr
                            key={item.id}
                            onClick={() => onRowClick?.(item)}
                            className={cn(
                                "hover:bg-slate-50/50 panel-transition",
                                onRowClick ? "cursor-pointer" : ""
                            )}
                        >
                            {columns.map((col, i) => (
                                <td key={i} className={cn(
                                    "px-4 py-3 text-[11px] font-medium text-slate-600 tracking-tight",
                                    col.className
                                )}>
                                    {typeof col.accessor === "function"
                                        ? col.accessor(item)
                                        : (item[col.accessor] as React.ReactNode)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                No operational data detected
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
