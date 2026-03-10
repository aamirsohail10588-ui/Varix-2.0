"use client";

import React from "react";
import { LucideIcon, Rocket, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModulePlaceholderProps {
    title: string;
    description: string;
    icon: LucideIcon;
    features?: string[];
    status?: "In Development" | "Planned" | "Early Access";
}

export default function ModulePlaceholder({
    title,
    description,
    icon: Icon,
    features = [],
    status = "In Development"
}: ModulePlaceholderProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center max-w-4xl mx-auto">
            {/* Animated Icon Container */}
            <div className="relative mb-8">
                <div className="absolute inset-0 rounded-3xl bg-primary-brand/10 blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 bg-white border border-sidebar-border rounded-2xl flex items-center justify-center shadow-sm">
                    <Icon size={36} className="text-primary-brand" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
                    {status}
                </div>
            </div>

            {/* Content */}
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
                {title}
            </h1>
            <p className="text-lg text-slate-500 mb-10 max-w-2xl leading-relaxed">
                {description}
            </p>

            {/* Feature Roadmap */}
            {features.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12 text-left">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex items-start space-x-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-sidebar-border transition-colors">
                            <div className="mt-1 flex-shrink-0">
                                <Rocket size={16} className="text-primary-brand/60" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{feature}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button size="lg" className="h-12 px-8 font-semibold">
                    <Bell className="mr-2" size={18} />
                    Notify me on Launch
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 font-semibold text-slate-600 hover:text-slate-900">
                    View Roadmap
                    <ArrowRight className="ml-2" size={18} />
                </Button>
            </div>

            {/* Beta Program Badge */}
            <div className="mt-16 p-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full" />
            <p className="mt-8 text-xs font-medium text-slate-400 uppercase tracking-widest">
                VARIX Alpha Program · Private Beta Access Q3 2026
            </p>
        </div>
    );
}
