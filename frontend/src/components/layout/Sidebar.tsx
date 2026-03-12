"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShieldCheck,
    RefreshCcw,
    Settings2,
    Workflow,
    CalendarCheck,
    Building2,
    FileBarChart,
    BrainCircuit,
    Database,
    History,
    CheckCircle2,
    Layers,
    Users,
    Settings,
    ShieldAlert,
    Archive,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    {
        group: "Core Navigation",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Financial Integrity", href: "/integrity", icon: ShieldCheck },
            { name: "Financial Changes", href: "/changes", icon: RefreshCcw },
            { name: "Controls", href: "/controls", icon: Settings2 },
            { name: "Workflows", href: "/workflows", icon: Workflow },
            { name: "Close Management", href: "/close", icon: CalendarCheck },
        ],
    },
    {
        group: "Financial Modules",
        items: [
            { name: "Tax Governance", href: "/modules/tax", icon: Building2 },
            { name: "Consolidation", href: "/modules/consolidation", icon: Layers },
            { name: "Reports", href: "/modules/reports", icon: FileBarChart },
            { name: "Financial Intelligence", href: "/modules/intelligence", icon: BrainCircuit },
        ],
    },
    {
        group: "Data & Integrations",
        items: [
            { name: "ERP Connections", href: "/data/connections", icon: Database },
            { name: "Ingestion History", href: "/data/history", icon: History },
            { name: "Data Quality", href: "/data/quality", icon: CheckCircle2 },
            { name: "Mappings", href: "/data/mappings", icon: Archive },
        ],
    },
    {
        group: "Administration",
        items: [
            { name: "Users & Roles", href: "/admin/users", icon: Users },
            { name: "Tenant Settings", href: "/admin/settings", icon: Settings },
            { name: "Security", href: "/admin/security", icon: ShieldAlert },
            { name: "Audit Logs", href: "/admin/audit", icon: History },
        ],
    },
];

export default function Sidebar({
    collapsed,
    setCollapsed
}: {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void
}) {
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Failed to parse user from localStorage", e);
                }
            }
        }
    }, []);

    const userInitials = user?.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        : "??";

    return (
        <div
            className={cn(
                "fixed left-0 top-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border panel-transition z-50",
                collapsed ? "w-[72px]" : "w-[240px]"
            )}
        >
            {/* Brand Header */}
            <div className="h-16 flex items-center justify-between px-6 border-bottom border-sidebar-border">
                {!collapsed && (
                    <span className="font-bold text-xl tracking-tight text-primary-brand text-foreground">VARIX</span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1 hover:bg-slate-100 rounded-md transition-colors text-sidebar-foreground"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
                {navigation.map((group) => (
                    <div key={group.group} className="mb-6">
                        {!collapsed && (
                            <h3 className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {group.group}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const active = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center mx-3 px-3 py-2 rounded-md group transition-all duration-200",
                                            active
                                                ? "bg-blue-50 text-primary-brand font-medium"
                                                : "text-sidebar-foreground hover:bg-slate-50 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className={cn("shrink-0", active ? "text-primary-brand" : "text-slate-400 group-hover:text-slate-600")} size={20} />
                                        {!collapsed && (
                                            <span className="ml-3 text-sm truncate">{item.name}</span>
                                        )}
                                        {active && !collapsed && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-brand" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / User Profile Summary */}
            <div className="p-4 border-t border-sidebar-border">
                <div className={cn("flex items-center group cursor-pointer", collapsed ? "justify-center" : "space-x-3")}>
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                        {userInitials}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">{user?.name || "User"}</p>
                            <p className="text-[10px] text-slate-400 truncate text-slate-400">VARIX {user?.role || "Member"}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
