"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ZoneProps {
    title: string;
    description: string;
    children: React.ReactNode;
    className?: string;
}

const Zone = ({ title, description, children, className }: ZoneProps) => (
    <div className={cn("flex flex-col h-full space-y-4", className)}>
        <div className="px-2">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">{description}</p>
        </div>
        <div className="flex-1 space-y-4 relative">
            {children}
        </div>
    </div>
);

export default function AuthorityDashboardLayout({
    inputZone,
    coreZone,
    governanceZone,
}: {
    inputZone: React.ReactNode;
    coreZone: React.ReactNode;
    governanceZone: React.ReactNode;
}) {
    return (
        <div className="w-full max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                {/* ZONE 1: INPUT */}
                <div className="lg:col-span-3">
                    <Zone
                        title="Zone 01 — Input"
                        description="Data ingestion and external system synchronization layers."
                    >
                        {inputZone}
                    </Zone>
                </div>

                {/* ZONE 2: CORE ENGINE */}
                <div className="lg:col-span-4 lg:border-x lg:border-slate-100 lg:px-8">
                    <Zone
                        title="Zone 02 — Core Engine"
                        description="Canonical financial state processing and internal orchestration."
                    >
                        {coreZone}
                    </Zone>
                </div>

                {/* ZONE 3: GOVERNANCE & INTEL */}
                <div className="lg:col-span-5">
                    <Zone
                        title="Zone 03 — Governance & Intelligence"
                        description="Control surfaces, automated audits, and predictive intelligence."
                    >
                        {governanceZone}
                    </Zone>
                </div>
            </div>
        </div>
    );
}
