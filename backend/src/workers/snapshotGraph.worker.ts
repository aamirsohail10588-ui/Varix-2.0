import prisma from "../infrastructure/prisma";
import { fsgService } from "../modules/analytics/fsg.service";
import { monitoringService } from "../modules/system/monitoring.service";

const POLL_INTERVAL_MS = 10000; // Poll every 10 seconds
let lastProcessedSnapshotId: string | null = null;

async function processCompletedSnapshots() {
    try {
        // Monitor partition health periodically
        await monitoringService.checkPartitionHealth();

        // Find snapshots that are COMPLETED and haven't been processed by this worker yet
        // We use the 'COMPLETED' status and a timestamp/id checkpoint
        const snapshots = await prisma.snapshot.findMany({
            where: {
                status: "COMPLETED",
                ...(lastProcessedSnapshotId ? {
                    id: { not: lastProcessedSnapshotId },
                } : {})
            },
            orderBy: { snapshot_timestamp: "asc" }, // Strict chronological processing
            take: 10,
        });

        if (snapshots.length === 0) return;

        console.log(`[SnapshotGraphWorker] Found ${snapshots.length} completed snapshots to propagate FSG.`);

        for (const snapshot of snapshots) {
            console.log(`[SnapshotGraphWorker] Processing snapshot: ${snapshot.id} for tenant: ${snapshot.tenant_id}`);

            // STEP 3: Ledger Integrity Verification
            const integrityOk = await monitoringService.checkLedgerIntegrity(snapshot.id);
            if (!integrityOk) {
                console.error(`[SnapshotGraphWorker] Integrity check failed for snapshot ${snapshot.id}. Skipping graph propagation.`);
                continue;
            }

            // To be efficient, we identify all UNIQUE accounts impacted by this snapshot
            const affectedAccounts = await prisma.ledgerEntry.findMany({
                where: { snapshot_id: snapshot.id },
                select: { account_id: true },
                distinct: ['account_id']
            });

            console.log(`[SnapshotGraphWorker] Detected ${affectedAccounts.length} affected accounts in snapshot ${snapshot.id}`);
            monitoringService.recordMetric("nodes_recomputed_per_snapshot", affectedAccounts.length);

            const startTime = Date.now();
            // Optimized: Set-based propagation for the entire snapshot
            console.log(`[SnapshotGraphWorker] Triggering batch propagation for snapshot ${snapshot.id}...`);
            await fsgService.propagateSnapshotsBatch(snapshot.id, snapshot.tenant_id);

            monitoringService.recordMetric("graph_propagation_duration_ms", Date.now() - startTime);

            // STEP 5: Graph Consistency Check
            await monitoringService.checkGraphConsistency(snapshot.id, snapshot.tenant_id);

            lastProcessedSnapshotId = snapshot.id;
        }

    } catch (error) {
        console.error("[SnapshotGraphWorker] Error processing snapshots:", error);
    }
}

export function startSnapshotGraphWorker() {
    console.log("[SnapshotGraphWorker] Started.");
    setInterval(processCompletedSnapshots, POLL_INTERVAL_MS);
}

// Start immediately if this file is run directly
if (require.main === module) {
    startSnapshotGraphWorker();
}
