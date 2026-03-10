"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function WorkflowsPage() {
    const [metrics, setMetrics] = useState([
        { title: "Cycle Progress", value: "...", trend: 0, status: "info" as any, suffix: "%" },
        { title: "Total Tasks", value: "...", status: "info" as any },
        { title: "Pending Review", value: "...", status: "info" as any },
        { title: "Avg Cycle Speed", value: "...", status: "info" as any, suffix: "days" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const response = await api.get("/governance/cycles/current");
                if (response.data && response.data.cycle) {
                    const cycle = response.data.cycle;
                    const tasks = cycle.tasks || [];

                    const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
                    const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
                    const pendingReview = tasks.filter((t: any) => t.status === "PENDING" || t.status === "REVIEW").length;

                    setMetrics([
                        { title: "Cycle Progress", value: progress.toFixed(0), trend: 12.4, status: "success", suffix: "%" },
                        { title: "Total Tasks", value: tasks.length.toString(), status: "info" },
                        { title: "Pending Review", value: pendingReview.toString(), status: "warning" },
                        { title: "Avg Cycle Speed", value: "18.2", status: "success", suffix: "days" },
                    ]);

                    setTableData(tasks.map((t: any) => ({
                        id: t.id,
                        workflow: "Financial Close",
                        priority: t.priority || "Medium",
                        owner: t.assignedRoleId || "Unassigned",
                        date: new Date(t.createdAt).toLocaleDateString(),
                        status: t.status,
                        description: t.description || `Closing task: ${t.name}`,
                        type: "WORKFLOW_TASK",
                        raw: t
                    })));
                } else {
                    setTableData([]);
                }
            } catch (error) {
                console.error("Failed to fetch workflows", error);
            }
        };

        fetchWorkflows();
    }, []);

    const columns = [
        { header: "ID", accessor: "id" },
        { header: "Workflow", accessor: "workflow" },
        { header: "Priority", accessor: "priority" },
        { header: "Owner Role", accessor: "owner" },
        { header: "Status", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Financial Workflows"
            description="Streamline standard operating procedures and financial operations. Assign tasks, track progress, and ensure operational compliance."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
