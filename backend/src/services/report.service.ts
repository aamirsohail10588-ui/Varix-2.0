/**
 * MODULE: Report Service
 * PATH: src/services/report.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 *
 * NOTE: integrity.service.ts does not exist.
 * Integrity data is fetched directly via prisma queries inline.
 * TODO: Create src/services/integrity.service.ts and refactor once built.
 */

import prisma from "../infrastructure/prisma"
import { ExportService, ExportFormat } from "./export.service";
import { logAuditAction } from "./audit.service";

interface IntegrityData {
    score: number;
    journal_mismatch_rate: number;
    total_violations: number;
    evidence_coverage_ratio: number;
}

const fetchIntegrityData = async (tenantId: string): Promise<IntegrityData> => {
    const latestHealth = await prisma.financialHealthIndex.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { calculated_at: "desc" },
    });

    const totalViolations = await prisma.controlResult.count({
        where: { controlRun: { tenantId } },
    });

    return {
        score: latestHealth ? Math.round(latestHealth.final_score * 100) : 0,
        journal_mismatch_rate: latestHealth
            ? Math.round(latestHealth.integrity_component * 100) / 100
            : 0,
        total_violations: totalViolations,
        evidence_coverage_ratio: latestHealth
            ? Math.round(latestHealth.evidence_component * 100)
            : 0,
    };
};

export class ReportService {

    static async generateFinancialReport(
        tenantId: string,
        userId: string,
        format: ExportFormat = ExportFormat.PDF
    ) {
        console.log(
            `[ReportService] Generating full financial report for tenant ${tenantId}...`
        );

        const integrityData = await fetchIntegrityData(tenantId);

        const violations = await prisma.controlResult.findMany({
            where: { controlRun: { tenantId } },
            include: { controlSpec: true },
            take: 50,
        });

        const title = `VARIX Financial Governance Report - ${new Date().toLocaleDateString()}`;
        const headers = ["Section", "Metric", "Value", "Status"];

        const data: (string | number)[][] = [
            [
                "Financial Integrity",
                "Integrity Score",
                `${integrityData.score}%`,
                integrityData.score > 80 ? "STRONG" : "NEEDS ATTENTION",
            ],
            [
                "Financial Integrity",
                "Mismatch Rate",
                `${integrityData.journal_mismatch_rate}%`,
                "N/A",
            ],
            [
                "Controls",
                "Total Violations",
                integrityData.total_violations,
                integrityData.total_violations > 0 ? "ACTION REQUIRED" : "CLEAR",
            ],
            [
                "Evidence",
                "Coverage Ratio",
                `${integrityData.evidence_coverage_ratio}%`,
                integrityData.evidence_coverage_ratio > 90 ? "COMPLIANT" : "FAILING",
            ],
            ["---", "---", "---", "---"],
            ["CONTROL VIOLATIONS (Top 50)", "", "", ""],
        ];

        violations.forEach((v) => {
            data.push(["Control", v.controlSpec.name, v.severity, v.violation_message]);
        });

        const buffer = await ExportService.generateExport({
            title,
            headers,
            data,
            format,
        });

        await logAuditAction(
            "REPORT_GENERATED",
            "Report",
            "FINANCIAL_SUMMARY",
            { format, tenantId },
            userId,
            tenantId
        );

        return {
            buffer,
            fileName: `VARIX_Report_${Date.now()}.${format.toLowerCase()}`,
        };
    }
}