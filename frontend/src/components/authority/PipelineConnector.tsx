"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PipelineConnectorProps {
    direction: "horizontal" | "vertical" | "curved";
    className?: string;
    animated?: boolean;
}

export default function PipelineConnector({ direction, className, animated = true }: PipelineConnectorProps) {
    if (direction === "horizontal") {
        return (
            <div className={cn("h-px bg-slate-100 flex items-center justify-center relative overflow-hidden", className)}>
                {animated && (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pipeline-flow" />
                )}
            </div>
        );
    }

    if (direction === "vertical") {
        return (
            <div className={cn("w-px bg-slate-100 flex items-center justify-center relative overflow-hidden", className)}>
                {animated && (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-blue-400/30 to-transparent animate-pipeline-flow-v" />
                )}
            </div>
        );
    }

    return (
        <svg className={cn("overflow-visible", className)} width="40" height="40" viewBox="0 0 40 40">
            <path
                d="M 0 20 Q 20 20 20 40"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="1"
            />
            {animated && (
                <path
                    d="M 0 20 Q 20 20 20 40"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="animate-pipeline-dash"
                    opacity="0.3"
                />
            )}
        </svg>
    );
}
