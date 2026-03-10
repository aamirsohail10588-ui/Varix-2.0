"use client";

import React, { useEffect, useState } from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";
import api from "@/lib/api";

export default function TaxPage() {
    const [metrics, setMetrics] = useState([
        { title: "Effective Tax Rate", value: "22.4", trend: -0.5, status: "info" as any, suffix: "%" },
        { title: "Validation Mismatches", value: "...", status: "error" as any },
        { title: "Pending Filings", value: "...", status: "warning" as any },
        { title: "Tax Provisioning", value: "98.2", trend: 0.8, status: "success" as any, suffix: "%" },
    ]);
    const [tableData, setTableData] = useState<any[]>([]);

    useEffect(() => {
        const fetchTaxData = async () => {
            try {
                // Use violations API which contains tax related checks (e.g. GST, VAT)
                const response = await api.get("/governance/violations");
                const violations = response.data.violations || [];
                const taxViolations = violations.filter((v: any) =>
                    v.controlSpec.name.toLowerCase().includes("tax") ||
                    v.controlSpec.name.toLowerCase().includes("gst") ||
                    v.controlSpec.name.toLowerCase().includes("vat")
                );

                setMetrics([
                    { title: "Effective Tax Rate", value: "22.4", trend: -0.5, status: "info", suffix: "%" },
                    { title: "Tax Mismatches", value: taxViolations.length.toString(), trend: 0, status: "error", suffix: "" },
                    { title: "Pending Filings", value: "4", trend: 0, status: "warning", suffix: "" },
                    { title: "Tax Compliance", value: "98.2", trend: 0.8, status: "success", suffix: "%" },
                ]);

                if (taxViolations.length > 0) {
                    setTableData(taxViolations.map((v: any) => ({
                        id: v.id,
                        entity: v.entity_reference || "Global",
                        type: v.controlSpec.name,
                        ref: `TAX-${v.id.substring(0, 4)}`,
                        amount: v.controlSpec.parameters?.threshold ? `$ ${v.controlSpec.parameters.threshold}` : "N/A",
                        tax: "Calculated",
                        status: v.severity,
                        description: v.violation_message
                    })));
                } else {
                    // Fallback or empty state
                    setTableData([]);
                }
            } catch (error) {
                console.error("Failed to fetch tax data", error);
            }
        };

        fetchTaxData();
    }, []);

    const columns = [
        { header: "Entity", accessor: "entity" },
        { header: "Record Type", accessor: "type" },
        { header: "Reference", accessor: "ref" },
        { header: "Threshold/Value", accessor: "amount" },
        { header: "Tax Status", accessor: "tax" },
        { header: "Severity", accessor: "status" },
    ];

    return (
        <ModuleWorkspace
            title="Tax Governance"
            description="Automate tax positioning and compliance across global jurisdictions. Manage GST/VAT validations, monitor tax risk vectors, and ensure audit readiness."
            metrics={metrics}
            tableColumns={columns}
            tableData={tableData}
        />
    );
}
