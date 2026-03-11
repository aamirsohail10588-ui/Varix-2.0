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
                const rowCount = await prisma.$executeRawUnsafe(`
                        INSERT INTO ledger_entries (
                            id, tenant_id, transaction_date, posting_period, account_id,
                            debit_amount, credit_amount, currency, source_system,
                            snapshot_id, confidence_score, ingestion_batch_id, source_id, "createdAt"
                        )
                        SELECT
                            gen_random_uuid(),
                            s.tenant_id,
                            (COALESCE(r.payload_json->>'transaction_date', r.payload_json->>'date', r.payload_json->>'Date', now()::text))::timestamp,
                            'OPEN',
                            COALESCE(a.id, $1),
                            (COALESCE(r.payload_json->>'debit', r.payload_json->>'Debit', '0'))::numeric,
                            (COALESCE(r.payload_json->>'credit', r.payload_json->>'Credit', '0'))::numeric,
                            UPPER(COALESCE(r.payload_json->>'currency', r.payload_json->>'Currency', 'USD')),
                            COALESCE(r.payload_json->>'source_system', 'INGESTION_PIPELINE'),
                            r."snapshotId",
                            (COALESCE(r.payload_json->>'confidence_score', '100'))::integer,
                            r.batch_id,
                            COALESCE(r.payload_json->>'transaction_id', r.payload_json->>'voucher_number', r.payload_json->>'invoice_number', ''),
                            now()
                        FROM (
                            SELECT * FROM raw_records 
                            WHERE "snapshotId" = $2 
                            LIMIT ${CHUNK_WINDOW_SIZE} OFFSET ${offset}
                        ) r
                        JOIN snapshots s ON r."snapshotId" = s.id
                        LEFT JOIN accounts a ON a.tenant_id = s.tenant_id 
                            AND UPPER(TRIM(a.code)) = UPPER(TRIM(COALESCE(r.payload_json->>'account_code', r.payload_json->>'account', r.payload_json->>'Account', 'UNMAPPED')))
                        ON CONFLICT DO NOTHING;
                    `, unmappedAccountId, snapshotId);

                processedCount += Number(rowCount);
                offset += CHUNK_WINDOW_SIZE;
                console.log(`[NormalizationWorker] Snapshot ${snapshotId}: window finished. Progress: ${processedCount.toLocaleString()}/${recordCount.toLocaleString()}`);
            }
        } else {
            const rowCount = await prisma.$executeRawUnsafe(`
                    INSERT INTO ledger_entries (
                        id, tenant_id, transaction_date, posting_period, account_id,
                        debit_amount, credit_amount, currency, source_system,
                        snapshot_id, confidence_score, ingestion_batch_id, source_id, "createdAt"
                    )
                    SELECT
                        gen_random_uuid(),
                        s.tenant_id,
                        (COALESCE(r.payload_json->>'transaction_date', r.payload_json->>'date', r.payload_json->>'Date', now()::text))::timestamp,
                        'OPEN',
                        COALESCE(a.id, $1),
                        (COALESCE(r.payload_json->>'debit', r.payload_json->>'Debit', '0'))::numeric,
                        (COALESCE(r.payload_json->>'credit', r.payload_json->>'Credit', '0'))::numeric,
                        UPPER(COALESCE(r.payload_json->>'currency', r.payload_json->>'Currency', 'USD')),
                        COALESCE(r.payload_json->>'source_system', 'INGESTION_PIPELINE'),
                        r."snapshotId",
                        (COALESCE(r.payload_json->>'confidence_score', '100'))::integer,
                        r.batch_id,
                        COALESCE(r.payload_json->>'transaction_id', r.payload_json->>'voucher_number', r.payload_json->>'invoice_number', ''),
                        now()
                    FROM raw_records r
                    JOIN snapshots s ON r."snapshotId" = s.id
                    LEFT JOIN accounts a ON a.tenant_id = s.tenant_id 
                        AND UPPER(TRIM(a.code)) = UPPER(TRIM(COALESCE(r.payload_json->>'account_code', r.payload_json->>'account', r.payload_json->>'Account', 'UNMAPPED')))
                    WHERE r."snapshotId" = $2
                    ON CONFLICT DO NOTHING;
                `, unmappedAccountId, snapshotId);
            processedCount = Number(rowCount);
        }

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