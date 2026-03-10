import prisma from "../../infrastructure/prisma";
import { Prisma } from "@prisma/client";

export class FsgService {
    /**
     * Recomputes state for a single node deterministically.
     * FSG Principle: State is always derived, never incrementally mutated.
     */
    async computeNodeState(nodeId: string, snapshotId?: string): Promise<void> {
        const node = await prisma.graphNode.findUnique({
            where: { id: nodeId },
            include: {
                edges_in: {
                    include: {
                        sourceNode: true,
                    },
                },
            },
        });

        if (!node) return;

        // Idempotency check: Skip if already computed for this snapshot
        const currentState = (node.state_value as any) || {};
        if (snapshotId && currentState.last_snapshot_id === snapshotId) {
            return;
        }

        let computedState: any = {};

        switch (node.node_type) {
            case "ACCOUNT":
                computedState = await this.computeAccountState(node.tenant_id, node.reference_id);
                break;
            case "COST_CENTER":
            case "ENTITY":
            case "VENDOR":
            case "CUSTOMER":
            case "FINANCIAL_HEALTH":
                computedState = await this.aggregateChildStates(node);
                break;
            default:
                console.warn(`[FsgService] Unknown node type: ${node.node_type}`);
                return;
        }

        // Add lineage metadata
        if (snapshotId) {
            computedState.last_snapshot_id = snapshotId;
        } else {
            computedState.last_snapshot_id = currentState.last_snapshot_id;
        }

        // Idempotent Update with Versioning
        await prisma.graphNode.update({
            where: { id: nodeId },
            data: {
                state_value: computedState as Prisma.InputJsonValue,
                last_computed_at: new Date(),
                version: { increment: 1 },
            },
        });
    }

    private async computeAccountState(tenantId: string, accountId: string): Promise<any> {
        const aggregation = await prisma.ledgerEntry.aggregate({
            where: {
                tenant_id: tenantId,
                account_id: accountId,
            },
            _sum: {
                debit_amount: true,
                credit_amount: true,
            },
        });

        const debit = Number(aggregation._sum.debit_amount || 0);
        const credit = Number(aggregation._sum.credit_amount || 0);

        return {
            balance: debit - credit,
            total_debit: debit,
            total_credit: credit,
        };
    }

    private async aggregateChildStates(node: any): Promise<any> {
        // Aggregate states from incoming edges (source nodes are children)
        const children = node.edges_in.map((edge: any) => edge.sourceNode);

        let totalBalance = 0;
        const subMetrics: Record<string, number> = {};

        for (const child of children) {
            const state = (child.state_value as any) || {};
            totalBalance += Number(state.balance || 0);

            // Collect other metrics if available
            for (const [key, value] of Object.entries(state)) {
                if (typeof value === "number" && key !== "balance") {
                    subMetrics[key] = (subMetrics[key] || 0) + value;
                }
            }
        }

        return {
            balance: totalBalance,
            ...subMetrics,
            child_count: children.length,
        };
    }

    /**
     * Propagates changes from a node up to its parents.
     */
    async propagateState(nodeId: string, snapshotId?: string): Promise<void> {
        await this.computeNodeState(nodeId, snapshotId);

        const node = await prisma.graphNode.findUnique({
            where: { id: nodeId },
            include: {
                edges_out: {
                    select: { target_node_id: true },
                },
            },
        });

        if (!node || !node.edges_out.length) return;

        // Recursively propagate to parents
        for (const edge of node.edges_out) {
            await this.propagateState(edge.target_node_id, snapshotId);
        }
    }

    /**
     * Static helper to find or create an ACCOUNT node for propagation
     */
    async getAccountNodeId(tenantId: string, accountId: string): Promise<string | null> {
        const node = await prisma.graphNode.findUnique({
            where: {
                tenant_id_node_type_reference_id: {
                    tenant_id: tenantId,
                    node_type: "ACCOUNT",
                    reference_id: accountId,
                },
            },
            select: { id: true },
        });

        return node?.id || null;
    }

    /**
     * Batch propagation for a given snapshot.
     * Identifies all affected accounts and triggers propagation in parallel.
     */
    async propagateSnapshotsBatch(snapshotId: string, tenantId: string): Promise<void> {
        const affectedAccounts = await prisma.ledgerEntry.findMany({
            where: { snapshot_id: snapshotId },
            select: { account_id: true },
            distinct: ["account_id"],
        });

        console.log(`[FsgService] Batch propagating for ${affectedAccounts.length} accounts in snapshot ${snapshotId}`);

        // Process in concurrent batches of 20 to avoid event loop starvation while maintaining high-speed
        const batchSize = 20;
        for (let i = 0; i < affectedAccounts.length; i += batchSize) {
            const currentBatch = affectedAccounts.slice(i, i + batchSize);
            await Promise.all(
                currentBatch.map(async (entry) => {
                    const nodeId = await this.getAccountNodeId(tenantId, entry.account_id);
                    if (nodeId) {
                        await this.propagateState(nodeId, snapshotId);
                    }
                })
            );
        }
    }
}

export const fsgService = new FsgService();
