"use client";

import React from "react";
import { Search, Bell, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopBar({ collapsed }: { collapsed: boolean }) {
    return (
        <header
            className="fixed top-0 right-0 h-16 bg-white border-b border-sidebar-border flex items-center px-8 z-40 transition-all duration-300"
            style={{ left: collapsed ? '72px' : '240px' }}
        >
            <div className="flex items-center space-x-6">
                {/* Selectors Group */}
                <div className="flex items-center space-x-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Tenant</span>
                        <button className="flex items-center space-x-1 text-sm font-semibold hover:text-primary-brand transition-colors">
                            <span>Acme Corp</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Entity</span>
                        <button className="flex items-center space-x-1 text-sm font-semibold hover:text-primary-brand transition-colors">
                            <span>North America</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Fiscal Period</span>
                        <button className="flex items-center space-x-1 text-sm font-semibold hover:text-primary-brand transition-colors">
                            <span>March 2026</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                {/* Global Search */}
                <div className="relative ml-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search financial records, controls, or insights..."
                        className="w-[400px] h-9 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-brand/20 focus:border-primary-brand transition-all"
                    />
                </div>
            </div>

            <div className="ml-auto flex items-center space-x-4">
                <button className="p-2 hover:bg-slate-100 rounded-full relative text-slate-500 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>

                <div className="h-4 w-px bg-slate-200" />

                <button className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-brand/10 flex items-center justify-center text-primary-brand">
                        <User size={18} />
                    </div>
                    <span className="text-sm font-medium">Administrator</span>
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
            </div>
        </header>
    );
}
