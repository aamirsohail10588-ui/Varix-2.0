"use client";

import {
    Database,
    UploadCloud,
    Zap,
    Layers,
    RefreshCcw,
    BookOpen,
    ShieldCheck,
    Scale,
    Eye,
    FileText,
    LineChart,
    BrainCircuit,
    Activity,
    Search
} from "lucide-react";

// Authority Components
import AuthorityDashboardLayout from "@/components/authority/AuthorityDashboardLayout";
import ArchitectureNode from "@/components/authority/ArchitectureNode";
import PipelineConnector from "@/components/authority/PipelineConnector";
import LedgerActivityTimeline from "@/components/authority/LedgerActivityTimeline";
import SystemStatusIndicator from "@/components/authority/SystemStatusIndicator";

// Enterprise Components
import MetricTile from "@/components/enterprise/MetricTile";

// Context
import { useSystem } from "@/context/SystemContext";

export default function DashboardPage() {
    const {
        health,
        ledger,
        ingestion,
        governance,
        anomalies,
        integrity,
        loading,
        error,
        refresh
    } = useSystem();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initializing Control Surface...</span>
            </div>
        );
    }

    if (error || !health || !integrity || !anomalies) {
        return (
            <div className="p-8 text-center text-rose-500 font-bold uppercase tracking-widest flex flex-col items-center space-y-4">
                <span>Critical Connectivity Failure</span>
                <button onClick={refresh} className="px-4 py-2 bg-slate-900 text-white text-[10px] rounded-md transition-all active:scale-95">Reconnect</button>
            </div>
        );
    }

    const closeProgressPct = governance.currentCycle
        ? Math.round((governance.currentCycle.tasks.filter((t: any) => t.status === "COMPLETED").length / governance.currentCycle.tasks.length) * 100)
        : 0;

    return (
        <div className="space-y-6 pb-12 overflow-x-hidden">
            {/* TOP BAR / SYSTEM INDICATOR */}
            <div className="flex items-center justify-between px-2 mb-8">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">AUTHORITY <span className="text-slate-400 font-medium">CONTROL SURFACE</span></h1>
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase border border-blue-100">Live Topology</div>
                </div>
                <SystemStatusIndicator
                    status={health.status}
                    latency={health.latency}
                    uptime={health.uptime}
                />
            </div>

            <AuthorityDashboardLayout
                inputZone={
                    <>
                        <ArchitectureNode
                            id="sources"
                            title="Sources"
                            icon={Database}
                            state="ACTIVE"
                            href="/entities"
                            metrics={[
                                { label: "Connectors", value: 12 },
                                { label: "State", value: "Syncing", status: "success" }
                            ]}
                        />
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" />
                        <ArchitectureNode
                            id="ingestion"
                            title="Ingestion"
                            icon={UploadCloud}
                            state={ingestion.queueDepth > 0 ? "PROCESSING" : "ACTIVE"}
                            href="/data/ingestion"
                            metrics={[
                                { label: "Queue", value: ingestion.queueDepth, status: ingestion.queueDepth > 0 ? "warning" : "success" },
                                { label: "Completed", value: ingestion.history.length, status: "success" }
                            ]}
                            lastActivity="2m ago"
                        />
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" animated={ingestion.queueDepth > 0} />
                        <ArchitectureNode
                            id="orchestration"
                            title="Orchestration"
                            icon={Zap}
                            state="ACTIVE"
                            href="/modules/ingestion"
                            metrics={[
                                { label: "Workers", value: 4 },
                                { label: "Fairness", value: "Nominal", status: "success" }
                            ]}
                        />
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" />
                        <ArchitectureNode
                            id="conditioning"
                            title="Data Conditioning"
                            icon={Layers}
                            state={ingestion.queueDepth > 0 ? "PROCESSING" : "ACTIVE"}
                            href="/integrity"
                            metrics={[
                                { label: "Lat.", value: `${health.latency}ms` },
                                { label: "Partitions", value: "Healthy", status: "success" }
                            ]}
                        />
                    </>
                }
                coreZone={
                    <>
                        <ArchitectureNode
                            id="lineage"
                            title="Data Lineage"
                            icon={RefreshCcw}
                            state="ACTIVE"
                            href="/changes"
                            metrics={[
                                { label: "Snapshots", value: ingestion.history.length },
                                { label: "Provenance", value: "Verified", status: "success" }
                            ]}
                        />
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" />
                        <ArchitectureNode
                            id="ledger"
                            title="Canonical Ledger"
                            icon={BookOpen}
                            state="ACTIVE"
                            href="/integrity"
                            className="border-primary-brand/30 shadow-blue-50"
                            metrics={[
                                { label: "Entries", value: ledger?.total_entries.toLocaleString() || "..." },
                                { label: "Integrity", value: `${ledger?.integrity_score}%`, status: "success" }
                            ]}
                        />
                        <div className="mt-4">
                            <LedgerActivityTimeline
                                data={[
                                    { time: "00:00", volume: 120 },
                                    { time: "04:00", volume: 450 },
                                    { time: "08:00", volume: 890 },
                                    { time: "12:00", volume: 1400 },
                                    { time: "16:00", volume: 1100 },
                                    { time: "20:00", volume: 600 },
                                    { time: "23:59", volume: 200 },
                                ]}
                            />
                        </div>
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" />
                        <ArchitectureNode
                            id="reconciliation"
                            title="Reconciliation"
                            icon={RefreshCcw}
                            state="ACTIVE"
                            href="/reconciliation"
                            metrics={[
                                { label: "Match Rate", value: "98.2%", status: "success" },
                                { label: "Exceptions", value: 12, status: "warning" }
                            ]}
                        />
                        <PipelineConnector direction="vertical" className="h-8 mx-auto" />
                        <ArchitectureNode
                            id="close"
                            title="Financial Close"
                            icon={ShieldCheck}
                            state={closeProgressPct < 100 ? "ACTIVE" : "IDLE"}
                            href="/close"
                            metrics={[
                                { label: "Progress", value: `${closeProgressPct}%`, status: "info" },
                                { label: "Due", value: "2 days" }
                            ]}
                        />
                    </>
                }
                governanceZone={
                    <div className="grid grid-cols-2 gap-4">
                        <ArchitectureNode
                            id="integrity"
                            title="Integrity"
                            icon={ShieldCheck}
                            state="ACTIVE"
                            href="/integrity"
                            metrics={[
                                { label: "Health", value: integrity.integrity_component.toFixed(1), status: integrity.integrity_component > 90 ? "success" : "warning" }
                            ]}
                        />
                        <ArchitectureNode
                            id="tax"
                            title="Tax Integrity"
                            icon={Scale}
                            state="ACTIVE"
                            href="/integrity"
                            metrics={[
                                { label: "Tax Risk", value: anomalies.tax_risk.toFixed(1), status: anomalies.tax_risk < 30 ? "success" : "warning" }
                            ]}
                        />
                        <ArchitectureNode
                            id="governance"
                            title="Governance"
                            icon={Eye}
                            state="ACTIVE"
                            href="/controls"
                            metrics={[
                                { label: "Violations", value: governance.violations.length, status: governance.violations.length > 0 ? "error" : "success" }
                            ]}
                        />
                        <ArchitectureNode
                            id="anomaly"
                            title="Anomaly Det."
                            icon={Search}
                            state="ACTIVE"
                            href="/integrity"
                            metrics={[
                                { label: "Journals", value: anomalies.journal_risk.toFixed(1), status: anomalies.journal_risk < 40 ? "success" : "warning" }
                            ]}
                        />
                        <ArchitectureNode
                            id="audit"
                            title="Audit Evidence"
                            icon={FileText}
                            state="ACTIVE"
                            href="/close"
                            metrics={[
                                { label: "Evid. Pkg", value: "Ready", status: "success" }
                            ]}
                        />
                        <ArchitectureNode
                            id="fpa"
                            title="FP&A"
                            icon={LineChart}
                            state="ACTIVE"
                            href="/modules/analytics"
                            metrics={[
                                { label: "Accuracy", value: "99.4%" }
                            ]}
                        />
                        <div className="col-span-2">
                            <ArchitectureNode
                                id="intelligence"
                                title="Financial Intelligence"
                                icon={BrainCircuit}
                                state="ACTIVE"
                                href="/modules/analytics"
                                className="bg-slate-900 border-slate-800"
                                metrics={[
                                    { label: "Health Score", value: integrity.final_score.toFixed(1), status: "success" },
                                    { label: "Insights", value: 3 }
                                ]}
                            />
                        </div>
                    </div>
                }
            />

            {/* QUICK STATS SUMMARY SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricTile
                    title="System Latency"
                    value={health.latency}
                    suffix="ms"
                    trend={-5}
                    status={health.status === "HEALTHY" ? "success" : "warning"}
                    icon={Activity}
                />
                <MetricTile
                    title="Ledger Integrity"
                    value={ledger?.integrity_score || 100}
                    suffix="%"
                    trend={0.5}
                    status="success"
                    icon={ShieldCheck}
                />
                <MetricTile
                    title="Queue Depth"
                    value={ingestion.queueDepth}
                    status={ingestion.queueDepth > 10 ? "error" : "success"}
                    icon={UploadCloud}
                />
                <MetricTile
                    title="Control Signal"
                    value={integrity.integrity_component.toFixed(1)}
                    status="success"
                    icon={Scale}
                />
                <MetricTile
                    title="Open Violations"
                    value={governance.violations.length}
                    status={governance.violations.length > 5 ? "error" : "success"}
                    icon={Eye}
                />
                <MetricTile
                    title="Journal Risk"
                    value={anomalies.journal_risk.toFixed(1)}
                    status={anomalies.journal_risk > 40 ? "warning" : "success"}
                    icon={Search}
                />
            </div>
        </div>
    );
}
