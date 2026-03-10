"use client";

import React from "react";
import ModuleWorkspace from "../../components/dashboard/ModuleWorkspace";

export default function MappingsPage() {
    const metrics = [
        { title: "Mapping Coverage", value: "92.4", trend: 1.5, status: "success" as const, suffix: "%" },
        { title: "Auto-mapped", value: "842", trend: 5.2, status: "info" as const },
        { title: "Manual Review", value: "64", trend: -10.0, status: "warning" as const },
        { title: "Confidence Avg", value: "94.8", trend: 0.2, status: "success" as const, suffix: "%" },
    ];

    const columns = [
        { header: "ERP Account", accessor: "erpAccount" },
        { header: "Canonical Account", accessor: "canonicalAccount" },
        {
            header: "Mapping Confidence", accessor: "confidence", render: (val: number) => (
                <div className="flex items-center space-x-2">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-brand" style={{ width: `${val}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">{val}%</span>
                </div>
            )
        },
        { header: "Last Updated", accessor: "date" },
        { header: "Status", accessor: "status" },
    ];

    const data = [
        {
            id: "MAP-001",
            erpAccount: "SAP-12000 (AR-US)",
            canonicalAccount: "Accounts Receivable",
            confidence: 100,
            date: "Mar 06, 2026",
            status: "Resolved",
            description: "Direct 1:1 mapping between SAP S/4HANA sub-ledger and VARIX canonical AR node. Verified against historical transaction patterns."
        },
        {
            id: "MAP-002",
            erpAccount: "NS-40010 (Sales-EU)",
            canonicalAccount: "Revenue - Services",
            confidence: 88,
            date: "Mar 05, 2026",
            status: "In Review",
            description: "AI suggested mapping based on description 'Consulting Revenue France'. Requires manual confirmation as this account has dual-purpose legacy entries."
        },
        {
            id: "MAP-003",
            erpAccount: "TLY-EXP-65 (Travel)",
            canonicalAccount: "Travel & Entertainment",
            confidence: 94,
            date: "Mar 06, 2026",
            status: "Resolved",
            description: "Automated mapping. Tally Prime extraction node identified as operational expense category. Matching confidence high due to consistent metadata."
        },
        {
            id: "MAP-004",
            erpAccount: "ZOH-INC-02 (Misc Inc)",
            canonicalAccount: "Other Income",
            confidence: 65,
            date: "Mar 04, 2026",
            status: "Pending Action",
            description: "Low confidence mapping detected. Sample records show a mix of interest income and tax refunds. Manual rule-based categorization recommended."
        },
    ];

    return (
        <ModuleWorkspace
            title="Entity & GL Mappings"
            description="Orchestrate the structural relationship between disparate ERP data and the VARIX canonical ledger. Manage chart of account mappings and entity hierarchies."
            metrics={metrics}
            tableColumns={columns}
            tableData={data}
        />
    );
}
