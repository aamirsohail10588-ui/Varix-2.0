import prisma from "../infrastructure/prisma";
import { monitoringService } from "../modules/system/monitoring.service";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once every 24 hours
const RETENTION_DAYS = 90;

export async function runRawRecordsCleanup() {
    console.log(`[CleanupWorker] Starting Raw Records archival process (Retention: ${RETENTION_DAYS} days)...`);

    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - RETENTION_DAYS);

        // Find snapshots that are completed and older than the threshold
        const snapshotsToArchive = await prisma.snapshot.findMany({
            where: {
                status: "COMPLETED",
                snapshot_timestamp: { lt: thresholdDate }
            },
            select: { id: true }
        });

        if (snapshotsToArchive.length === 0) {
            console.log("[CleanupWorker] No snapshots found for archival.");
            return;
        }

        console.log(`[CleanupWorker] Found ${snapshotsToArchive.length} snapshots to archive. Deleting linked raw_records...`);

        let totalDeleted = 0;
        for (const snapshot of snapshotsToArchive) {
            const result = await prisma.$executeRawUnsafe(
                `DELETE FROM raw_records WHERE "snapshotId" = $1`,
                snapshot.id
            );
            totalDeleted += Number(result);
        }

        console.log(`[CleanupWorker] Cleanup complete. Deleted ${totalDeleted.toLocaleString()} raw records.`);
        monitoringService.recordMetric("nodes_recomputed_per_snapshot" as any, totalDeleted); // Reusing for generic count tracking

    } catch (error) {
        console.error("[CleanupWorker] Error during raw records cleanup:", error);
    }
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startCleanupWorker() {
    if (cleanupTimer) return;

    console.log("[CleanupWorker] Lifecycle worker started.");

    // Run immediately then on interval
    runRawRecordsCleanup();
    cleanupTimer = setInterval(runRawRecordsCleanup, CLEANUP_INTERVAL_MS);
}

export function stopCleanupWorker() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

if (require.main === module) {
    startCleanupWorker();
}
