"use client";

import React from "react";
import { X, Clock, FileText, MessageSquare, Terminal, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useState } from "react";

interface ContextPanelProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export default function ContextPanel({ isOpen, onClose, data }: ContextPanelProps) {
    const [isResolving, setIsResolving] = useState(false);
    const [isResolved, setIsResolved] = useState(false);
    const [comment, setComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [isEscalating, setIsEscalating] = useState(false);

    if (!data) return null;

    const handleComment = async () => {
        if (!comment.trim()) return;
        setIsPosting(true);
        try {
            const isWorkflow = data.type === "WORKFLOW_TASK" || data.id?.startsWith("TSK");
            const endpoint = isWorkflow ? `/close/tasks/${data.id}/comments` : `/controls/violations/${data.id}/comments`;
            await api.post(endpoint, { comment });
            setComment("");
            alert("Comment posted to internal thread.");
        } catch (error) {
            console.error("Comment failed", error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleEscalate = async () => {
        setIsEscalating(true);
        try {
            await api.post(`/governance/tasks/${data.id}/approve`, { reason: "CFO Review Required" });
            alert("Issue escalated to CFO.");
        } catch (error) {
            console.error("Escalation failed", error);
        } finally {
            setIsEscalating(false);
        }
    };

    const handleResolve = async () => {
        setIsResolving(true);
        try {
            // Connect to real backend for resolution
            await api.patch(`/controls/violations/${data.id || "mock"}/resolve`);
            setIsResolved(true);
            setTimeout(() => {
                onClose();
                setIsResolved(false);
            }, 1500);
        } catch (error) {
            console.error("Resolution failed", error);
            alert("Failed to resolve issue. Please try again.");
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <div
            className={cn(
                "fixed top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl z-[60] panel-transition flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Issue Details</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Core Info */}
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <span className="text-[10px] font-bold uppercase text-red-600 tracking-widest">Action Required</span>
                        <h4 className="text-xl font-bold text-slate-900 mt-1">{data.title || data.type}</h4>
                        <p className="text-sm text-slate-700 mt-2 font-medium">{data.description || "Potential governance violation detected during automated control execution."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Impact Value</span>
                            <p className="text-sm font-bold text-slate-900">{data.amount || "$12,450.00"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Risk Score</span>
                            <p className="text-sm font-bold text-red-500">88/100</p>
                        </div>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                    <h4 className="flex items-center text-sm font-bold text-slate-800">
                        <Clock size={16} className="mr-2 text-primary-brand" />
                        Activity Timeline
                    </h4>
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-slate-100">
                        <div className="relative pl-8">
                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                            <p className="text-xs font-bold text-slate-900 leading-none">System Detection</p>
                            <p className="text-[10px] text-slate-400 mt-1">Mar 06, 2026 • 09:12 AM</p>
                        </div>
                        <div className="relative pl-8">
                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary-brand border-4 border-white shadow-sm" />
                            <p className="text-xs font-bold text-slate-900 leading-none">Assigned to Aamir Sohail</p>
                            <p className="text-[10px] text-slate-400 mt-1">Mar 06, 2026 • 09:14 AM</p>
                        </div>
                    </div>
                </div>

                {/* Evidence Vault */}
                <div className="space-y-4">
                    <h4 className="flex items-center text-sm font-bold text-slate-800">
                        <FileText size={16} className="mr-2 text-primary-brand" />
                        Evidence Vault
                    </h4>
                    <div className="p-3 border border-slate-100 rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-500 mr-3">
                                PDF
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900">INV-2026-004.pdf</p>
                                <p className="text-[10px] text-slate-400">Captured from SAP S/4HANA</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comment Thread */}
                <div className="space-y-4">
                    <h4 className="flex items-center text-sm font-bold text-slate-800">
                        <MessageSquare size={16} className="mr-2 text-primary-brand" />
                        Internal Thread
                    </h4>
                    <div className="relative">
                        <textarea
                            placeholder="Add an internal note or context..."
                            className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-brand focus:bg-white transition-all resize-none"
                        />
                        <button className="absolute bottom-2 right-2 px-3 py-1 bg-primary-brand text-white text-[10px] font-bold rounded">
                            Post
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
                <button
                    onClick={handleResolve}
                    disabled={isResolving || isResolved}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                        isResolved ? "bg-emerald-500 text-white" : "bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600"
                    )}
                >
                    {isResolving ? <Loader2 size={14} className="animate-spin" /> : (isResolved ? <Check size={14} /> : null)}
                    {isResolved ? "Resolution Recorded" : "Approve Resolution"}
                </button>
                <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all">
                    Escalate to CFO
                </button>
            </div>
        </div>
    );
}
