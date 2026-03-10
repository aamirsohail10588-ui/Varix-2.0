"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";
import {
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";

// Layout Components
import StatCard from "../components/dashboard/StatCard";
import AlertPanel from "../components/dashboard/AlertPanel";
import CloseProgress from "../components/dashboard/CloseProgress";
import RiskHeatmap from "../components/dashboard/RiskHeatmap";
import InsightsCard from "../components/dashboard/InsightsCard";
import WorkflowQueue from "../components/dashboard/WorkflowQueue";
import ContextPanel from "../components/dashboard/ContextPanel";

export default function DashboardPage() {
    const [fhiData, setFhiData] = useState<any>(null);
    const [riskVectors, setRiskVectors] = useState<any>(null);
    const [controlViolations, setControlViolations] = useState<any[]>([]);
    const [activeCycle, setActiveCycle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const [fhi, risk, violations, close] = await Promise.all([
                api.get(`/analytics/financial-health?period=2026-03`),
                api.get(`/analytics/risk-vectors?period=2026-03`),
                api.get(`/governance/violations`),
                api.get(`/governance/cycles/current`)
            ]);

            setFhiData(fhi.data);
            setRiskVectors(risk.data);
            setControlViolations(violations.data.violations || []);
            setActiveCycle(close.data.cycle);
        } catch (error) {
            console.error("Failed to load dashboard metrics", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectIssue = (item: any) => {
        setSelectedItem(item);
        setIsPanelOpen(true);
    };

    if (loading || !fhiData || !riskVectors) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-brand"></div>
            </div>
        );
    }

    const closeProgressPct = activeCycle && activeCycle.tasks
        ? Math.round((activeCycle.tasks.filter((t: any) => t.status === "COMPLETED").length / activeCycle.tasks.length) * 100)
        : 0;

    return (
        <div className="space-y-8 pb-12">
            {/* ROW 1: KPI SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard
                    title="Financial Health"
                    value={fhiData.final_score.toFixed(1)}
                    trend={2.4}
                    status={fhiData.final_score > 80 ? "success" : "warning"}
                    suffix="pts"
                />
                <StatCard
                    title="Integrity Score"
                    value={fhiData.integrity_component.toFixed(1)}
                    trend={1.2}
                    status="success"
                    suffix="pts"
                />
                <StatCard
                    title="Close Progress"
                    value={closeProgressPct}
                    trend={15}
                    status="info"
                    suffix="%"
                />
                <StatCard
                    title="Journal Risk"
                    value={riskVectors.journal_risk.toFixed(1)}
                    trend={-5.2}
                    status={riskVectors.journal_risk < 30 ? "success" : "error"}
                />
                <StatCard
                    title="Tax Risk"
                    value={riskVectors.tax_risk.toFixed(1)}
                    trend={0.8}
                    status="warning"
                />
                <StatCard
                    title="Control Violations"
                    value={controlViolations.length}
                    trend={-12}
                    status={controlViolations.length > 5 ? "error" : "success"}
                />
            </div>

            {/* ROW 2: ALERTS AND CLOSE STATUS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div onClick={() => handleSelectIssue({ type: "Duplicate Invoice Detected", amount: "$4,200.00", status: "Critical", user: "Finance Team" })}>
                    <AlertPanel
                        alerts={controlViolations.map(v => ({
                            id: v.id,
                            type: v.controlSpec.name,
                            amount: "$2,450.00",
                            status: "Pending Action",
                            user: "Aamir Sohail",
                            severity: "high"
                        }))}
                    />
                </div>
                <CloseProgress
                    tasks={activeCycle?.tasks || []}
                    overallProgress={closeProgressPct}
                />
            </div>

            {/* ROW 3: RISK HEATMAP AND INSIGHTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RiskHeatmap
                    risks={[
                        { name: "Journal Risk", score: riskVectors.journal_risk, previousScore: 28 },
                        { name: "Tax Risk", score: riskVectors.tax_risk, previousScore: 42 },
                        { name: "Override Risk", score: riskVectors.override_risk, previousScore: 12 },
                        { name: "Close Risk", score: riskVectors.close_risk, previousScore: 35 },
                    ]}
                />
                <InsightsCard
                    insights={[
                        { id: "1", category: "Variance", text: "Revenue decreased 5% due to reduced sales in region West.", impact: "negative" },
                        { id: "2", category: "Efficiency", text: "Close cycle speed improved by 12% following workflow automation.", impact: "positive" },
                        { id: "3", category: "Governance", text: "Journal overrides higher than threshold; audit recommended.", impact: "negative" },
                    ]}
                />
            </div>

            {/* ROW 4: WORKFLOW QUEUE */}
            <div onClick={() => handleSelectIssue({ title: "GST Mismatch Resolution", priority: "High", owner: "Aamir Sohail", status: "Action Required" })}>
                <WorkflowQueue
                    tasks={[
                        { id: "1", title: "Duplicate Invoice Review: Amazon Web Services", priority: "High", owner: "Aamir Sohail", dueDate: "Mar 07, 2026", status: "Action Required" },
                        { id: "2", title: "GST Mismatch Resolution: Entity North", priority: "Medium", owner: "Jane Doe", dueDate: "Mar 08, 2026", status: "In Review" },
                        { id: "3", title: "Journal Override Approval: Batch #4492", priority: "High", owner: "System Admin", dueDate: "Mar 06, 2026", status: "Action Required" },
                    ]}
                />
            </div>

            {/* Sidebar Slide-in Detail Panel */}
            <ContextPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                data={selectedItem}
            />
        </div>
    );
}

