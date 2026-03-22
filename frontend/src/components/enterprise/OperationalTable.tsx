"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Unified column definition supporting two calling conventions:
 *  1. { header, accessor } — accessor is a key or render function (legacy pattern used in page files)
 *  2. { key, label, render } — explicit key + optional render (used in mappings/intelligence pages)
 */
type Column<T> =
    | {
        header: string;
        accessor: keyof T | ((item: T) => React.ReactNode);
        className?: string;
        key?: never;
        label?: never;
        render?: never;
    }
    | {
        key: keyof T | string;
        label: string;
        render?: (item: T) => React.ReactNode;
        className?: string;
        header?: never;
        accessor?: never;
    };

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
    className,
}: OperationalTableProps<T>) {
    function getHeader(col: Column<T>): string {
        return col.header ?? col.label ?? "";
    }

    function renderCell(col: Column<T>, item: T): React.ReactNode {
        // Convention 1: header/accessor
        if (col.accessor !== undefined) {
            return typeof col.accessor === "function"
                ? col.accessor(item)
                : (item[col.accessor as keyof T] as React.ReactNode);
        }
        // Convention 2: key/render
        if (col.render) return col.render(item);
        return item[col.key as keyof T] as React.ReactNode;
    }

    return (
        <div
            className={cn(
                "overflow-x-auto border border-slate-100 rounded-lg bg-white shadow-sm",
                className
            )}
        >
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        {columns.map((col, i) => (
                            <th
                                key={i}
                                className={cn(
                                    "px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",
                                    col.className
                                )}
                            >
                                {getHeader(col)}
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
                                "hover:bg-slate-50/50 transition-colors",
                                onRowClick ? "cursor-pointer" : ""
                            )}
                        >
                            {columns.map((col, i) => (
                                <td
                                    key={i}
                                    className={cn(
                                        "px-4 py-3 text-[11px] font-medium text-slate-600 tracking-tight",
                                        col.className
                                    )}
                                >
                                    {renderCell(col, item)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                            >
                                No operational data detected
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}