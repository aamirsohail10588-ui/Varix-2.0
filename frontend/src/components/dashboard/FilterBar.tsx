"use client";

import React from "react";
import { Search, Filter, Calendar, Building2, Layers } from "lucide-react";

export default function FilterBar() {
    return (
        <div className="p-4 border-b border-sidebar-border bg-slate-50/30 flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-brand/20 transition-all font-medium"
                />
            </div>

            {/* Entity Filter */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg h-9 px-3 cursor-pointer hover:border-sidebar-border transition-all">
                <Building2 size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Entity:</span>
                <select className="bg-transparent text-xs font-bold text-slate-900 border-none focus:ring-0 cursor-pointer">
                    <option>All Entities</option>
                    <option>North America</option>
                    <option>European Union</option>
                    <option>APAC Region</option>
                </select>
            </div>

            {/* Period Filter */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg h-9 px-3 cursor-pointer hover:border-sidebar-border transition-all">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Period:</span>
                <select className="bg-transparent text-xs font-bold text-slate-900 border-none focus:ring-0 cursor-pointer">
                    <option>March 2026</option>
                    <option>February 2026</option>
                    <option>January 2026</option>
                    <option>Q4 2025</option>
                </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg h-9 px-3 cursor-pointer hover:border-sidebar-border transition-all">
                <Layers size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Status:</span>
                <select className="bg-transparent text-xs font-bold text-slate-900 border-none focus:ring-0 cursor-pointer">
                    <option>All Status</option>
                    <option>Pending Action</option>
                    <option>In Review</option>
                    <option>Resolved</option>
                </select>
            </div>

            {/* Advanced Filters Button */}
            <button className="h-9 px-4 flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Filter size={14} />
                <span>Advanced</span>
            </button>
        </div>
    );
}
