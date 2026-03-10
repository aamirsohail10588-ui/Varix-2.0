/**
 * MODULE: Demo Service
 * PATH: src/services/demo.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import prisma from "../infrastructure/prisma";
import { ingestionService } from "../modules/ingestion/ingestion.service";
import { analyticsService } from "../modules/analytics/analytics.service";
import { workerService, JobType } from "./worker.service";
import type { Prisma } from "@prisma/client";

export const generateDemoData = async (tenantId: string) => {

    // Seed Control Specs
    const existingSpecs = await prisma.controlSpec.count({ where: { tenantId } });
    if (existingSpecs === 0) {
        await prisma.controlSpec.createMany({
            data: [
                {
                    tenantId,
                    name: "Large Journal Over $1M",
                    ruleType: "THRESHOLD",
                    parameters: { limit: 1000000 },
                    severity: "BLOCKER",
                },
                {
                    tenantId,
                    name: "Duplicate Invoice Detection v2",
                    ruleType: "duplicate_invoice_detection_v2",
                    parameters: {},
                    severity: "ERROR",
                },
                {
                    tenantId,
                    name: "Voucher Sequence Gap",
                    ruleType: "SEQUENCE_GAP",
                    parameters: {},
                    severity: "WARNING",
                },
                {
                    tenantId,
                    name: "Ledger Balance Mismatch",
                    ruleType: "DEBIT_CREDIT_MISMATCH",
                    parameters: {},
                    severity: "CRITICAL",
                },
            ],
        });
    }

    // Seed Vendors
    const vendorsToCreate = Array.from({ length: 200 }, (_, i) => ({
        tenantId,
        name: `Global Tech Vendor 0${i + 1} Solutions`,
    }));
    await prisma.vendor.createMany({ data: vendorsToCreate, skipDuplicates: true });

    // Seed Accounts
    const accountNames = [
        "CASH", "SALES", "RENT", "PAYROLL", "TAX",
        "EQUIPMENT", "SOFTWARE", "AP", "AR", "CAPITAL",
    ];

    for (const name of accountNames) {
        await prisma.account.upsert({
            where: { tenantId_code: { tenantId, code: name } },
            update: {},
            create: {
                tenantId,
                code: name,
                name: `${name} General Account`,
                type: name === "SALES" ? "REVENUE" : "ASSET",
            },
        });
    }

    // Create Ingestion Batch
    const batch = await prisma.ingestionBatch.create({
        data: {
            tenant_id: tenantId,
            source_type: "DEMO_GENERATOR",
            file_name: "synthetic_demo_ledger_10k.csv",
            status: "processing",
            record_count: 10000,
        },
    });

    const now = new Date();
    const rawRecords: { batch_id: string; payload_json: Prisma.InputJsonValue }[] = [];
    let invoiceCounter = 1000;
    const NUM_PAIRS = 5000;

    for (let i = 0; i < NUM_PAIRS; i++) {
        const daysAgo = Math.floor(Math.random() * 90);
        const txDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        let dateStr = txDate.toISOString().split("T")[0];

        if (i % 5 === 0) invoiceCounter++;
        let finalInv = `INV-260-${invoiceCounter}`;
        let amount = Math.floor(Math.random() * 8000) + 100;

        if (i < 25) amount = 1500000;
        if (i >= 25 && i < 50) {
            finalInv = "INV-DUPLICATE-BREACH-001";
            amount = 5555;
            dateStr = now.toISOString().split("T")[0];
        }

        const account = accountNames[Math.floor(Math.random() * accountNames.length)];

        rawRecords.push({
            batch_id: batch.id,
            payload_json: {
                Account: account,
                Debit: amount,
                Credit: 0,
                Currency: "USD",
                Date: dateStr,
                invoice_number: finalInv,
                voucher_number: `V-${Date.now()}-${i}`,
            },
        });

        rawRecords.push({
            batch_id: batch.id,
            payload_json: {
                Account: accountNames[Math.floor(Math.random() * accountNames.length)],
                Debit: 0,
                Credit: amount,
                Currency: "USD",
                Date: dateStr,
                invoice_number: finalInv,
                voucher_number: `V-${Date.now()}-${i}`,
            },
        });
    }

    const chunkSize = 2000;
    for (let i = 0; i < rawRecords.length; i += chunkSize) {
        await prisma.rawRecord.createMany({
            data: rawRecords.slice(i, i + chunkSize),
        });
    }

    // Hand off to normalization worker via snapshot
    // processBatch does not exist — correct method is normalizeToLedgerEntries
    await ingestionService.normalizeToLedgerEntries(tenantId, batch.id);

    // Seed Network Metrics
    // Schema unique key is @@unique([industry, company_size, metric_name, calculated_at])
    // Prisma generates: industry_company_size_metric_name_calculated_at
    const industry = "Technology";
    const timestamp = new Date();

    const metricBaselines = [
        { name: "duplicate_invoice_rate", median: 0.7, p75: 1.2 },
        { name: "journal_mismatch_rate", median: 0.5, p75: 0.9 },
        { name: "control_violation_density", median: 0.4, p75: 0.8 },
        { name: "close_cycle_duration", median: 6, p75: 8 },
        { name: "evidence_coverage_ratio", median: 85, p75: 95 },
        { name: "override_frequency", median: 1.2, p75: 2.5 },
    ];

    for (const m of metricBaselines) {
        await prisma.networkMetric.upsert({
            where: {
                industry_company_size_metric_name_calculated_at: {
                    industry,
                    company_size: "Mid-Market",
                    metric_name: m.name,
                    calculated_at: timestamp,
                },
            },
            update: {
                average_value: m.median * 1.1,
                percentile_50: m.median,
                percentile_75: m.p75,
            },
            create: {
                industry,
                company_size: "Mid-Market",
                metric_name: m.name,
                average_value: m.median * 1.1,
                percentile_25: m.median * 0.6,
                percentile_50: m.median,
                percentile_75: m.p75,
                percentile_95: m.p75 * 1.4,
                calculated_at: timestamp,
            },
        });
    }

    // Seed FHI history (last 6 months)
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const period = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
        await analyticsService.calculateFHI(tenantId, period);
    }

    await workerService.pushJob(JobType.METRICS_REFRESH, { tenantId });

    return {
        success: true,
        message:
            "Successfully seeded 10,000 strict Ledger Transactions, Industry Benchmarks, and 6-month Governance History.",
    };
};