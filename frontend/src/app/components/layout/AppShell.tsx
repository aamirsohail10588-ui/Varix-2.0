"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = Cookies.get("token");
        const isAuthPage = pathname.includes("/login") || pathname.includes("/register");

        if (!token && !isAuthPage) {
            router.push("/login");
        }

        // Proactively clear potentially restricted cookies if on auth pages
        if (isAuthPage) {
            Cookies.remove("token", { path: "/login" });
            Cookies.remove("token", { path: "/register" });
            Cookies.remove("token", { path: "/" });
            Cookies.remove("tenantId", { path: "/" });
        }
    }, [pathname, router]);

    // Sync state with CSS variable for children to use if needed
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--sidebar-current-width",
            collapsed ? "72px" : "240px"
        );
    }, [collapsed]);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Portals or fixed elements like right context panel can be added here */}
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            <div
                className="flex-1 flex flex-col min-h-screen transition-all duration-300 relative"
                style={{ marginLeft: collapsed ? '72px' : '240px' }}
            >
                <TopBar collapsed={collapsed} />

                <main className="flex-1 mt-16 p-8 overflow-x-hidden">
                    <div className="max-w-[1440px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
