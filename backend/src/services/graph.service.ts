/**
 * MODULE: Graph Service
 * PATH: src/services/graph.service.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import prisma from "../lib/prisma";

export const buildGraphNetwork = async (tenantId: string): Promise<boolean> => {
    const nodes = new Map<string, { type: string; ref: string }>();
    const edges: {
        source_key: string;
        target_key: string;
        type: string;
    }[] = [];

    const getOrCreateNode = (type: string, ref: string): string => {
        const key = `${type}_${ref}`;
        if (!nodes.has(key)) {
            nodes.set(key, { type, ref });
        }
        return key;
    };

    // 1. Traverse Raw Records
    const ledgers = await prisma.rawRecord.findMany({
        where: { batch: { tenant_id: tenantId } },
    });

    for (const record of ledgers) {
        const payload = record.payload_json as Record<string, unknown>;
        if (!payload) continue;

        if (payload.vendor_id) {
            getOrCreateNode("VENDOR", String(payload.vendor_id));

            if (payload.invoice_number) {
                getOrCreateNode("INVOICE", String(payload.invoice_number));
                edges.push({
                    source_key: `INVOICE_${payload.invoice_number}`,
                    target_key: `VENDOR_${payload.vendor_id}`,
                    type: "BELONGS_TO_VENDOR",
                });
            }
        }

        const journalRef =
            payload.transaction_id ||
            payload.transaction_number ||
            payload.voucher_number ||
            payload.TransactionID;

        if (journalRef) {
            const ref = String(journalRef);
            getOrCreateNode("JOURNAL", ref);

            if (payload.invoice_number) {
                edges.push({
                    source_key: `JOURNAL_${ref}`,
                    target_key: `INVOICE_${payload.invoice_number}`,
                    type: "RELATED_TRANSACTION",
                });
            }

            const userRef = payload.posted_by || payload.user_id;
            if (userRef) {
                const uRef = String(userRef);
                getOrCreateNode("USER", uRef);
                edges.push({
                    source_key: `USER_${uRef}`,
                    target_key: `JOURNAL_${ref}`,
                    type: "POSTED_BY",
                });
            }
        }
    }

    // 2. Traverse Control Violations
    // Schema: ControlResult.overrides is ControlOverride? (optional single relation, not array)
    const violations = await prisma.controlResult.findMany({
        where: { controlRun: { tenantId } },
        include: { overrides: true },
    });

    for (const v of violations) {
        getOrCreateNode("CONTROL_VIOLATION", v.id);

        if (v.entity_reference) {
            getOrCreateNode("INVOICE", v.entity_reference);
            edges.push({
                source_key: `CONTROL_VIOLATION_${v.id}`,
                target_key: `INVOICE_${v.entity_reference}`,
                type: "VIOLATED_CONTROL",
            });
        }

        // overrides is ControlOverride? — single optional object, not an array
        if (v.overrides) {
            const override = v.overrides;
            getOrCreateNode("OVERRIDE", override.id);
            getOrCreateNode("USER", override.approvedById);

            edges.push({
                source_key: `OVERRIDE_${override.id}`,
                target_key: `CONTROL_VIOLATION_${v.id}`,
                type: "RELATED_TRANSACTION",
            });

            edges.push({
                source_key: `USER_${override.approvedById}`,
                target_key: `OVERRIDE_${override.id}`,
                type: "OVERRIDDEN_BY",
            });
        }
    }

    // 3. Upsert Nodes
    for (const [, node] of nodes.entries()) {
        await prisma.graphNode.upsert({
            where: {
                tenant_id_node_type_reference_id: {
                    tenant_id: tenantId,
                    node_type: node.type,
                    reference_id: node.ref,
                },
            },
            update: {},
            create: {
                tenant_id: tenantId,
                node_type: node.type,
                reference_id: node.ref,
            },
        });
    }

    // 4. Resolve Node IDs and Upsert Edges
    const dbNodes = await prisma.graphNode.findMany({
        where: { tenant_id: tenantId },
    });

    const dbNodeMap = new Map<string, string>();
    dbNodes.forEach((n) =>
        dbNodeMap.set(`${n.node_type}_${n.reference_id}`, n.id)
    );

    for (const e of edges) {
        const sourceId = dbNodeMap.get(e.source_key);
        const targetId = dbNodeMap.get(e.target_key);
        if (!sourceId || !targetId) continue;

        await prisma.graphEdge.upsert({
            where: {
                source_node_id_target_node_id_relationship_type: {
                    source_node_id: sourceId,
                    target_node_id: targetId,
                    relationship_type: e.type,
                },
            },
            update: {},
            create: {
                tenant_id: tenantId,
                source_node_id: sourceId,
                target_node_id: targetId,
                relationship_type: e.type,
            },
        });
    }

    return true;
};