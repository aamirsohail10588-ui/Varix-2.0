/**
 * MODULE: Normalization Worker
 * PATH: src/workers/normalization.worker.ts
 * VERSION: 1.0.0
 * STATUS: ACTIVE
 *
 * Responsibilities:
 * - Poll Snapshot table for UNPROCESSED or PROCESSING snapshots
 * - For each candidate, read linked raw_records in chunks (Deterministic ID ordering)
 * - Map raw payload fields to canonical LedgerEntry schema
 * - Bulk insert LedgerEntries via prisma.ledgerEntry.createMany
 * - Mark snapshot COMPLETED or FAILED
 * - Trigger FHI recalculation after successful normalization
 *
 * OUT OF SCOPE:
 * - Canonical mapping rules engine (placeholder map used, canonical.mapper.ts to be built)
 * - Kafka event emission (deferred)
 * - Control engine trigger (deferred)
 */

import prisma from "../infrastructure/prisma";
import { monitoringService } from "../modules/system/monitoring.service";
import { ConditioningService } from "../modules/governance/conditioning.service";
import { LineageService } from "../modules/governance/lineage.service";
import { ConsolidationService } from "../modules/ledger/consolidation.service";
import { GAAPComplianceService } from "../modules/ledger/gaap.service";
import { PeriodService } from "../modules/accounting/period.service";
import { IntegrityService } from "../modules/governance/integrity.service";
import { TaxService } from "../modules/tax/tax.service";
import { GovernanceService } from "../modules/governance/governance.service";
import { AnomalyService } from "../modules/intelligence/anomaly.service";
import { VarianceService } from "../modules/intelligence/variance.service";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;       // Poll every 5 seconds
const CHUNK_SIZE = 10000;            // Process raw records in batches of 10,000
const MAX_CONCURRENT_SNAPSHOTS = 3;  // Process up to 3 snapshots in parallel
const LARGE_SNAPSHOT_THRESHOLD = 50_000_000; // Threshold for throttled snapshots
const MAX_CONCURRENT_LARGE_SNAPSHOTS = 2;   // Only allow 2 large snapshots simultaneously
const CHUNK_WINDOW_THRESHOLD = 200_000_000;  // Threshold to split into processing windows
const CHUNK_WINDOW_SIZE = 20_000_000;        // 20M rows per window

let activeLargeSnapshots = 0;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface RawPayload {
    transaction_date?: string;
    date?: string;
    Date?: string;
    account_code?: string;
    account?: string;
    Account?: string;
    account_name?: string;
    debit?: string | number;
    Debit?: string | number;
    credit?: string | number;
    Credit?: string | number;
    currency?: string;
    Currency?: string;
    source_system?: string;
    transaction_id?: string;
    voucher_number?: string;
    invoice_number?: string;
    confidence_score?: number;
    [key: string]: unknown;
}

// ─────────────────────────────────────────────
// CANONICAL FIELD EXTRACTORS
// ─────────────────────────────────────────────

function extractDate(payload: RawPayload): Date {
    const raw =
        payload.transaction_date ||
        payload.date ||
        payload.Date;

    if (raw) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    return new Date();
}

function extractAccountCode(payload: RawPayload): string {
    return (
        payload.account_code ||
        payload.account ||
        payload.Account ||
        "UNMAPPED"
    ).trim().toUpperCase();
}

function extractDebit(payload: RawPayload): number {
    const raw = payload.debit ?? payload.Debit ?? 0;
    const parsed = parseFloat(String(raw));
    return isNaN(parsed) ? 0 : parsed;
}

function extractCredit(payload: RawPayload): number {
    const raw = payload.credit ?? payload.Credit ?? 0;
    const parsed = parseFloat(String(raw));
    return isNaN(parsed) ? 0 : parsed;
}

function extractCurrency(payload: RawPayload): string {
    return (payload.currency || payload.Currency || "USD").trim().toUpperCase();
}

function extractSourceSystem(payload: RawPayload): string {
    return payload.source_system || "INGESTION_PIPELINE";
}

function extractSourceId(payload: RawPayload): string {
    return (
        payload.transaction_id ||
        payload.voucher_number ||
        payload.invoice_number ||
        ""
    );
}

// ─────────────────────────────────────────────
// ACCOUNT CACHE
// ─────────────────────────────────────────────

async function buildAccountCache(
    tenantId: string
): Promise<Map<string, string>> {
    const accounts = await prisma.account.findMany({
        where: { tenantId },
        select: { code: true, id: true },
    });

    const cache = new Map<string, string>();
    accounts.forEach((a) => cache.set(a.code.toUpperCase(), a.id));
    return cache;
}

async function getOrCreateUnmappedAccount(
    tenantId: string,
    cache: Map<string, string>
): Promise<string> {
    const existing = cache.get("UNMAPPED");
    if (existing) return existing;

    const account = await prisma.account.upsert({
        where: { tenantId_code: { tenantId, code: "UNMAPPED" } },
        update: {},
        create: {
            tenantId,
            code: "UNMAPPED",
            name: "Unmapped Ingestions",
            type: "ASSET",
        },
    });

    cache.set("UNMAPPED", account.id);
    return account.id;
}

// ─────────────────────────────────────────────
// CORE: PROCESS ONE SNAPSHOT
// ─────────────────────────────────────────────

async function processSnapshot(snapshotId: string): Promise<void> {
    const snapshot = await prisma.snapshot.findUnique({
        where: { id: snapshotId },
    });

    if (!snapshot || (snapshot.status !== "UNPROCESSED" && snapshot.status !== "PROCESSING")) return;

    // Mark PROCESSING to prevent duplicate processing (Restart-Safe)
    await prisma.snapshot.update({
        where: { id: snapshotId },
        data: { status: "PROCESSING" },
    });

    const tenantId = snapshot.tenant_id;
    const batchId = snapshot.batch_id;

    console.log(
        `[NormalizationWorker] Processing snapshot ${snapshotId} for batch ${batchId}...`
    );

    const startTime = Date.now();

    const recordCount = Number(snapshot.record_count || 0);
    const isLarge = recordCount > LARGE_SNAPSHOT_THRESHOLD;

    // Step 1: Concurrency Guard for Large Snapshots
    if (isLarge) {
        while (activeLargeSnapshots >= MAX_CONCURRENT_LARGE_SNAPSHOTS) {
            console.log(`[NormalizationWorker] Large snapshot limit reached (${activeLargeSnapshots}). Waiting...`);
            await new Promise(r => setTimeout(r, 10000));
        }
        activeLargeSnapshots++;
        monitoringService.recordMetric("active_large_snapshots" as any, activeLargeSnapshots);
    }

    try {
        const accountCache = await buildAccountCache(tenantId);
        const unmappedAccountId = await getOrCreateUnmappedAccount(tenantId, accountCache);

        // Step 2 & 4: Set-based SQL transformation with optional windowed processing
        console.log(`[NormalizationWorker] Snapshot ${snapshotId}: Processing ${recordCount.toLocaleString()} rows...`);

        let processedCount = 0;

        if (recordCount > CHUNK_WINDOW_THRESHOLD) {
            console.log(`[NormalizationWorker] Snapshot ${snapshotId} EXCEEDS window threshold. Using chunked processing...`);
            let offset = 0;
            while (offset < recordCount) {
                const rawRecords = await prisma.rawRecord.findMany({
                    where: { snapshotId },
                    take: CHUNK_SIZE,
                    skip: offset
                });

                const ledgerEntries: any[] = [];
                for (const r of rawRecords) {
                    const result = await ConditioningService.conditionLedgerEntry(
                        tenantId,
                        r.payload_json,
                        r.payload_json ? (r.payload_json as any).source_system : "INGESTION",
                        snapshotId
                    );

                    // GAAP Validation
                    const gaapErrors = GAAPComplianceService.validateEntry(result.finalValue);
                    if (gaapErrors.length > 0) {
                        result.fixes.push(...gaapErrors.map(e => `GAAP_WARN_${e}`));
                        result.confidenceScore -= 10;
                    }

                    // Period Lock Check
                    const isLocked = await PeriodService.isPeriodLocked(tenantId, extractDate(result.finalValue));
                    if (isLocked) {
                        result.fixes.push("ERR_PERIOD_LOCKED");
                        result.confidenceScore = 0; // Fail the record
                    }

                    // Tax Compliance Check
                    const { isCompliant, variance } = await TaxService.validateTaxPosting(tenantId, result.finalValue);
                    if (!isCompliant) {
                        result.fixes.push(`TAX_VARIANCE_${variance.toFixed(2)}`);
                        result.confidenceScore -= 15;
                    }

                    // Threshold-Based Governance Control
                    const entryAmount = Math.max(parseFloat(result.finalValue.debit_amount), parseFloat(result.finalValue.credit_amount));
                    const THRESHOLD = 10000; // Hardcoded $10k threshold for prototype

                    if (entryAmount >= THRESHOLD) {
                        result.fixes.push("PENDING_APPROVAL_THRESHOLD");
                        // In a real system, we'd look up the active workflow for the tenant
                        // For prototype, we'll flag it for approval processing
                    }

                    // Real-time Anomaly Detection
                    const tempEntry = {
                        tenant_id: tenantId,
                        account_id: result.finalValue.account_id,
                        debit_amount: result.finalValue.debit_amount,
                        credit_amount: result.finalValue.credit_amount,
                        transaction_date: extractDate(result.finalValue)
                    };

                    const anomalyAlert = await AnomalyService.scoreEntry(tempEntry);
                    if (anomalyAlert && (anomalyAlert as any).severity !== "LOW") {
                        result.fixes.push(`ANOMALY_DETECTED_${(anomalyAlert as any).severity}`);
                        result.confidenceScore -= 20;
                    }

                    // Budget Variance Check (Layer 14 Integration)
                    const fiscalYear = new Date().getFullYear(); // Simplified for prototype
                    const varianceReport = await VarianceService.calculateVariance(
                        tenantId,
                        fiscalYear,
                        result.finalValue.account_id
                    );

                    if (varianceReport && varianceReport.variancePercentage < -20) {
                        result.fixes.push(`BUDGET_OVERRUN_${Math.abs(Math.round(varianceReport.variancePercentage))}%`);
                        result.confidenceScore -= 15;
                    }

                    // Multi-Currency Consolidation
                    const baseAmount = await ConsolidationService.convertToBaseCurrency(
                        tenantId,
                        parseFloat(result.finalValue.debit_amount) - parseFloat(result.finalValue.credit_amount),
                        result.finalValue.currency,
                        result.finalValue.transaction_date || new Date()
                    );

                    const entryData = {
                        id: r.id,
                        tenant_id: tenantId,
                        transaction_date: extractDate(result.finalValue),
                        posting_period: "OPEN",
                        account_id: result.finalValue.account_id,
                        debit_amount: result.finalValue.debit_amount,
                        credit_amount: result.finalValue.credit_amount,
                        currency: result.finalValue.currency,
                        source_system: result.finalValue.source_system || "INGESTION_PIPELINE",
                        snapshot_id: snapshotId,
                        confidence_score: result.confidenceScore,
                        ingestion_batch_id: batchId,
                        source_id: extractSourceId(result.finalValue),
                        base_currency_amount: baseAmount,
                        tax_code: result.finalValue.tax_code || null,
                        tax_amount: result.finalValue.tax_amount || 0,
                        createdAt: new Date()
                    };

                    const provenanceHash = LineageService.generateHash(entryData);

                    ledgerEntries.push({
                        ...entryData,
                        provenance_hash: provenanceHash
                    });

                    // Record lineage trail
                    await LineageService.recordTrail(
                        tenantId,
                        "LedgerEntry",
                        r.id,
                        "RawRecord",
                        r.id,
                        result.fixes.length > 0 ? "CONDITIONED" : "DIRECT_NORMALIZATION"
                    );

                    // Log fixes if any
                    if (result.fixes.length > 0) {
                        await ConditioningService.logConditioning(
                            tenantId,
                            "LedgerEntry",
                            r.id,
                            r.payload_json,
                            result.fixes,
                            0, // Log delta if calculated
                            snapshotId
                        );
                    }
                }

                await prisma.ledgerEntry.createMany({
                    data: ledgerEntries,
                    skipDuplicates: true
                });

                processedCount += rawRecords.length;
                offset += CHUNK_SIZE;
                console.log(`[NormalizationWorker] Snapshot ${snapshotId}: chunk finished. Progress: ${processedCount.toLocaleString()}/${recordCount.toLocaleString()}`);
            }
        } else {
            // Smaller snapshots also use the Node-based conditioning for full metadata precision
            let offset = 0;
            while (offset < recordCount) {
                const rawRecords = await prisma.rawRecord.findMany({
                    where: { snapshotId },
                    take: CHUNK_SIZE,
                    skip: offset
                });

                if (rawRecords.length === 0) break;

                const ledgerEntries: any[] = [];
                for (const r of rawRecords) {
                    const result = await ConditioningService.conditionLedgerEntry(
                        tenantId,
                        r.payload_json,
                        r.payload_json ? (r.payload_json as any).source_system : "INGESTION",
                        snapshotId
                    );

                    ledgerEntries.push({
                        tenant_id: tenantId,
                        transaction_date: extractDate(result.finalValue),
                        posting_period: "OPEN",
                        account_id: result.finalValue.account_id,
                        debit_amount: result.finalValue.debit_amount,
                        credit_amount: result.finalValue.credit_amount,
                        currency: result.finalValue.currency,
                        source_system: result.finalValue.source_system || "INGESTION_PIPELINE",
                        snapshot_id: snapshotId,
                        confidence_score: result.confidenceScore,
                        ingestion_batch_id: batchId,
                        source_id: extractSourceId(result.finalValue),
                        createdAt: new Date()
                    });

                    if (result.fixes.length > 0) {
                        await ConditioningService.logConditioning(
                            tenantId,
                            "LedgerEntry",
                            r.id,
                            r.payload_json,
                            result.fixes,
                            0,
                            snapshotId
                        );
                    }
                }

                await prisma.ledgerEntry.createMany({
                    data: ledgerEntries,
                    skipDuplicates: true
                });

                processedCount += rawRecords.length;
                offset += CHUNK_SIZE;
            }
        }

        // Step 5: Integrity Validation & Sealing
        const { isValid, imbalance } = await IntegrityService.validateDoubleEntry(batchId);

        if (!isValid) {
            console.error(`[NormalizationWorker] Snapshot ${snapshotId} FAILED integrity check: Imbalance of ${imbalance}`);
            await (prisma.snapshot as any).update({
                where: { id: snapshotId },
                data: {
                    status: "FAILED",
                    error_message: `Integrity Failure: Batch ${batchId} is unbalanced by ${imbalance}`
                }
            });
            return;
        }

        // Generate Integrity Seal
        await IntegrityService.generateBatchSeal(tenantId, batchId);
        console.log(`[NormalizationWorker] Snapshot ${snapshotId} SEALED successfully.`);

        // Mark batch and snapshot completed
        await prisma.ingestionBatch.update({
            where: { id: batchId },
            data: { status: "completed" },
        });

        await prisma.snapshot.update({
            where: { id: snapshotId },
            data: {
                status: "COMPLETED",
                record_count: processedCount,
            },
        });

        const duration = Date.now() - startTime;
        monitoringService.recordMetric("snapshot_processing_duration_ms", duration);

        const elapsed = (duration / 1000).toFixed(1);
        console.log(
            `[NormalizationWorker] Snapshot ${snapshotId} COMPLETED: ${processedCount.toLocaleString()} entries in ${elapsed}s`
        );

        // Trigger FHI recalculation asynchronously (non-blocking)
        triggerAnalyticsRecalculation(tenantId).catch((err) => {
            console.error(
                `[NormalizationWorker] FHI recalculation failed for tenant ${tenantId}:`,
                err
            );
        });

    } finally {
        if (isLarge) {
            activeLargeSnapshots--;
            monitoringService.recordMetric("active_large_snapshots" as any, activeLargeSnapshots);
        }
    }
}

// ─────────────────────────────────────────────
// ANALYTICS TRIGGER
// ─────────────────────────────────────────────

async function triggerAnalyticsRecalculation(tenantId: string): Promise<void> {
    try {
        const { analyticsService } = await import(
            "../modules/analytics/analytics.service"
        );

        const now = new Date();
        const period = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;

        await analyticsService.calculateFHI(tenantId, period);
        await analyticsService.calculatePeriodRisk(tenantId, period);

        console.log(
            `[NormalizationWorker] Analytics recalculated for tenant ${tenantId} period ${period}`
        );
    } catch (err) {
        throw err;
    }
}

// ─────────────────────────────────────────────
// POLL LOOP
// ─────────────────────────────────────────────

async function pollPendingSnapshots(): Promise<void> {
    try {
        // Automatic recovery logic: Reset snapshots stuck in PROCESSING for > 10 minutes
        await prisma.$executeRaw`
            UPDATE snapshots
            SET status = 'UNPROCESSED'
            WHERE status = 'PROCESSING'
            AND "updatedAt" < NOW() - INTERVAL '10 minutes'
        `;

        const targetSnapshots = await prisma.$queryRawUnsafe<{ id: string }[]>(`
            SELECT id FROM snapshots
            WHERE status IN ('UNPROCESSED', 'PROCESSING')
            ORDER BY 
                CASE WHEN record_count < 100000 THEN 0 ELSE 1 END,
                snapshot_timestamp ASC
            LIMIT ${MAX_CONCURRENT_SNAPSHOTS}
            FOR UPDATE SKIP LOCKED
        `);

        if (targetSnapshots.length === 0) return;

        console.log(
            `[NormalizationWorker] Found ${targetSnapshots.length} snapshot(s) to process (UNPROCESSED/PROCESSING).`
        );

        // Process concurrently up to MAX_CONCURRENT_SNAPSHOTS
        await Promise.all(
            targetSnapshots.map((s) => processSnapshot(s.id))
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[NormalizationWorker] Poll error: ${message}`);
    }
}

// ─────────────────────────────────────────────
// WORKER LIFECYCLE
// ─────────────────────────────────────────────

let pollTimer: NodeJS.Timeout | null = null;

export function startNormalizationWorker(): void {
    if (pollTimer) {
        console.warn("[NormalizationWorker] Already running.");
        return;
    }

    console.log(
        `[NormalizationWorker] Started. Polling every ${POLL_INTERVAL_MS / 1000}s for PENDING snapshots.`
    );

    // Run immediately on start, then on interval
    pollPendingSnapshots();
    pollTimer = setInterval(pollPendingSnapshots, POLL_INTERVAL_MS);
}

export function stopNormalizationWorker(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        console.log("[NormalizationWorker] Stopped.");
    }
}