import prisma from "../../infrastructure/prisma";

export interface Metrics {
    snapshot_processing_duration_ms: number[];
    normalization_batch_size: number[];
    snapshot_queue_depth: number;
    active_large_snapshots: number;
    raw_records_backlog: number;
    normalization_worker_latency: number[];
    nodes_recomputed_per_snapshot: number[];
    graph_propagation_duration_ms: number[];
}

class MonitoringService {
    private metrics: Metrics = {
        snapshot_processing_duration_ms: [],
        normalization_batch_size: [],
        snapshot_queue_depth: 0,
        active_large_snapshots: 0,
        raw_records_backlog: 0,
        normalization_worker_latency: [],
        nodes_recomputed_per_snapshot: [],
        graph_propagation_duration_ms: [],
    };

    private lastIntegrityResult: Record<string, { ok: boolean; raw: number; ledger: number }> = {};
    private lastConsistencyResult: Record<string, { ok: boolean; staleNodes: number }> = {};

    private MAX_LOG_SIZE = 100;

    recordMetric(key: keyof Metrics, value: number) {
        if (Array.isArray(this.metrics[key])) {
            (this.metrics[key] as number[]).push(value);
            if ((this.metrics[key] as number[]).length > this.MAX_LOG_SIZE) {
                (this.metrics[key] as number[]).shift();
            }
        } else {
            (this.metrics[key] as any) = value;
        }
    }

    async updateSystemMetrics() {
        const [pendingSnapshots, processingSnapshots, backlog] = await Promise.all([
            prisma.snapshot.count({ where: { status: "UNPROCESSED" } }),
            prisma.snapshot.count({ where: { status: "PROCESSING" } }),
            prisma.rawRecord.count({ where: { snapshotId: null } })
        ]);

        this.metrics.snapshot_queue_depth = pendingSnapshots + processingSnapshots;
        this.metrics.raw_records_backlog = backlog;
    }

    async getQueueDepths() {
        await this.updateSystemMetrics();
        return {
            unprocessed: await prisma.snapshot.count({ where: { status: "UNPROCESSED" } }),
            processing: await prisma.snapshot.count({ where: { status: "PROCESSING" } }),
            total: this.metrics.snapshot_queue_depth
        };
    }

    async checkPartitionHealth(): Promise<{ ok: boolean; defaultRows: number }> {
        try {
            const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                'SELECT count(*) FROM ledger_entries_default'
            );
            const count = Number(result[0]?.count || 0);

            if (count > 0) {
                console.warn(`[Monitoring] CRITICAL: Partition routing failure detected. ${count} rows found in ledger_entries_default.`);
            }

            return {
                ok: count === 0,
                defaultRows: count
            };
        } catch (error) {
            console.error("[Monitoring] Error checking partition health:", error);
            return { ok: false, defaultRows: -1 };
        }
    }

    async checkLedgerIntegrity(snapshotId: string): Promise<boolean> {
        try {
            const [rawCount, ledgerCount] = await Promise.all([
                prisma.rawRecord.count({ where: { snapshotId } }),
                prisma.ledgerEntry.count({ where: { snapshot_id: snapshotId } })
            ]);

            const ok = rawCount === ledgerCount;
            this.lastIntegrityResult[snapshotId] = { ok, raw: rawCount, ledger: ledgerCount };

            if (!ok) {
                console.error(`[Monitoring] Ledger normalization mismatch detected for snapshot ${snapshotId}. Raw: ${rawCount}, Ledger: ${ledgerCount}`);
            }

            return ok;
        } catch (error) {
            console.error(`[Monitoring] Error checking ledger integrity for snapshot ${snapshotId}:`, error);
            return false;
        }
    }

    async checkGraphConsistency(snapshotId: string, tenantId: string): Promise<boolean> {
        try {
            // Find nodes for the tenant that haven't been updated to this snapshot yet
            // Note: We use the last_snapshot_id stored inside the state_value JSON
            const staleNodesCount = await prisma.graphNode.count({
                where: {
                    tenant_id: tenantId,
                    NOT: {
                        state_value: {
                            path: ['last_snapshot_id'],
                            equals: snapshotId
                        }
                    }
                }
            });

            const ok = staleNodesCount === 0;
            this.lastConsistencyResult[snapshotId] = { ok, staleNodes: staleNodesCount };

            if (!ok) {
                console.warn(`[Monitoring] Graph propagation incomplete for snapshot ${snapshotId}. ${staleNodesCount} nodes are still stale.`);
            }

            return ok;
        } catch (error) {
            console.error(`[Monitoring] Error checking graph consistency for snapshot ${snapshotId}:`, error);
            return false;
        }
    }

    getHealthReport() {
        return {
            integrity: this.lastIntegrityResult,
            consistency: this.lastConsistencyResult,
        };
    }

    getMetrics() {
        return {
            ...this.metrics,
            averages: {
                snapshot_processing_duration: this.avg(this.metrics.snapshot_processing_duration_ms),
                normalization_batch_size: this.avg(this.metrics.normalization_batch_size),
                nodes_recomputed_per_snapshot: this.avg(this.metrics.nodes_recomputed_per_snapshot),
                graph_propagation_duration: this.avg(this.metrics.graph_propagation_duration_ms),
            }
        };
    }

    private avg(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

export const monitoringService = new MonitoringService();
