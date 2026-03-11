import prisma from "../infrastructure/prisma"
import _ from "lodash";

export const detectSnapshotChanges = async (tenantId: string, currentSnapshotId: string, previousSnapshotId: string) => {
    const currentRecords = await prisma.rawRecord.findMany({ where: { snapshotId: currentSnapshotId } });
    const previousRecords = await prisma.rawRecord.findMany({ where: { snapshotId: previousSnapshotId } });

    const extractKey = (data: any) => data.id || data.transaction_id || data.invoice_number || data.voucher_number || data.TransactionID || data.ID || JSON.stringify(data);

    const prevMap = new Map();
    previousRecords.forEach((r: any) => prevMap.set(extractKey(r.payload_json), r));

    const changeEvents: any[] = [];

    for (const curr of currentRecords) {
        const key = extractKey(curr.payload_json);
        const prev = prevMap.get(key);

        const currPayload = curr.payload_json as any;
        const prevPayload = prev?.payload_json as any;

        if (!prev) {
            changeEvents.push({
                tenant_id: tenantId,
                snapshot_to: currentSnapshotId,
                snapshot_from: previousSnapshotId,
                entity_type: "RECORD",
                entity_id: String(key),
                change_type: "RECORD_CREATED",
                new_value: currPayload || {},
                old_value: {}
            });
        } else {
            // Enhanced Comparison Logic
            const isModified = !_.isEqual(currPayload, prevPayload);

            if (isModified) {
                const currDate = new Date(currPayload?.transaction_date || currPayload?.Date || new Date()).getTime();
                const prevDate = new Date(prevPayload?.transaction_date || prevPayload?.Date || new Date()).getTime();

                let changeType = "RECORD_MODIFIED";

                // Detect Backdated Entry
                if (currDate < prevDate) {
                    changeType = "BACKDATED_ENTRY";
                }

                // Detect Period Edit (if period field exists)
                if (currPayload?.period && prevPayload?.period && currPayload.period !== prevPayload.period) {
                    changeType = "PERIOD_EDIT";
                }

                changeEvents.push({
                    tenant_id: tenantId,
                    snapshot_to: currentSnapshotId,
                    snapshot_from: previousSnapshotId,
                    entity_type: "RECORD",
                    entity_id: String(key),
                    change_type: changeType,
                    new_value: currPayload || {},
                    old_value: prevPayload || {}
                });
            }
            prevMap.delete(key);
        }
    }

    // Records that existed in previous but not in current are DELETED
    for (const [key, prev] of prevMap.entries()) {
        changeEvents.push({
            tenant_id: tenantId,
            snapshot_to: currentSnapshotId,
            snapshot_from: previousSnapshotId,
            entity_type: "RECORD",
            entity_id: String(key),
            change_type: "RECORD_DELETED",
            new_value: {},
            old_value: prev.payload_json || {}
        });
    }

    if (changeEvents.length > 0) {
        await prisma.changeEvent.createMany({
            data: changeEvents.map(e => ({
                ...e,
                // Ensure values are stored as JSON
                new_value: e.new_value as any,
                old_value: e.old_value as any
            }))
        });
    }
};
