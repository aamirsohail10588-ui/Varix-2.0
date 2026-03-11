"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Action {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
}

interface SystemActionBarProps {
    title: string;
    actions: Action[];
    className?: string;
}

export default function SystemActionBar({
    title,
    actions,
    className
}: SystemActionBarProps) {
    return (
        <div className={cn(
            "flex items-center justify-between pb-6 mb-6 border-b border-slate-100",
            className
        )}>
            <div className="flex items-center space-x-4">
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                    {title}
                </h2>
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Operational Control Surface
                </span>
            </div>

            <div className="flex items-center space-x-3">
                {actions.map((action, i) => {
                    const Icon = action.icon;
                    const variants = {
                        primary: "bg-slate-900 text-white hover:bg-black border-transparent",
                        secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200",
                        danger: "bg-rose-500 text-white hover:bg-rose-600 border-transparent"
                    };

                    return (
                        <button
                            key={i}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={cn(
                                "flex items-center space-x-2 px-3 py-1.5 border rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                                variants[action.variant || "secondary"],
                                action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
                            )}
                        >
                            {Icon && <Icon size={12} />}
                            <span>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
