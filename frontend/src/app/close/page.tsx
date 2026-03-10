"use client";

import React from "react";
import { CalendarCheck } from "lucide-react";
import ModulePlaceholder from "../components/dashboard/ModulePlaceholder";

export default function ClosePage() {
    return (
        <ModulePlaceholder
            title="Close Management"
            description="Accelerate your financial close cycle. Orchestrate month-end checklist, monitor progress, and achieve faster time-to-insight with governed automation."
            icon={CalendarCheck}
            features={[
                "Centralized Close Checklist",
                "Real-time Completion Tracking",
                "Balance Sheet Substantiation",
                "Financial Statement Readiness"
            ]}
        />
    );
}
