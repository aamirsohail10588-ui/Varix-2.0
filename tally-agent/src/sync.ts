import fs from "fs";
import path from "path";
import { fetchVouchers, getLatestAlterId, disconnectTally } from "./tally";
import { transformToCanonicalCSV } from "./transform";
import { uploadCSVBuffer } from "./upload";

const STATE_FILE = path.join(__dirname, "..", ".sync_state.json");

interface SyncState {
    lastSyncAlterId: number;
    lastSyncTime: string;
}

function readSyncState(): SyncState {
    if (fs.existsSync(STATE_FILE)) {
        try {
            const data = fs.readFileSync(STATE_FILE, "utf-8");
            return JSON.parse(data);
        } catch (e) {
            console.error(`[Sync] Failed to read state file, starting fresh.`);
        }
    }
    return { lastSyncAlterId: 0, lastSyncTime: new Date(0).toISOString() };
}

function writeSyncState(state: SyncState) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function executeDeltaSync() {
    console.log(`\n--- Starting Tally Delta Sync [${new Date().toISOString()}] ---`);
    let currentState = readSyncState();

    try {
        const vouchers = await fetchVouchers(currentState.lastSyncAlterId);

        if (vouchers && vouchers.length > 0) {
            console.log(`[Sync] Transforming ${vouchers.length} vouchers to CSV...`);
            const csvBuffer = transformToCanonicalCSV(vouchers);

            console.log(`[Sync] Uploading CSV buffer to VARIX...`);
            await uploadCSVBuffer(csvBuffer, `tally_sync_${Date.now()}.csv`);

            // Update state with max AlterId from this batch
            let maxAlterId = currentState.lastSyncAlterId;
            vouchers.forEach((v: any) => {
                const altId = Number(v.$AlterId);
                if (altId > maxAlterId) maxAlterId = altId;
            });

            // If Tally query returned somehow 0 max AlterId dynamically fallback natively checking highest AlterId entirely
            if (maxAlterId === currentState.lastSyncAlterId) {
                maxAlterId = await getLatestAlterId();
            }

            console.log(`[Sync] Sync successful. Updating state. Old AlterId: ${currentState.lastSyncAlterId}, New AlterId: ${maxAlterId}`);
            writeSyncState({ lastSyncAlterId: maxAlterId, lastSyncTime: new Date().toISOString() });
        } else {
            console.log(`[Sync] No new vouchers since AlterId ${currentState.lastSyncAlterId}.`);
        }

    } catch (e: any) {
        console.error(`[Sync] Critical failure during execution: ${e.message}`);
    } finally {
        await disconnectTally();
        console.log(`--- Sync Cycle Complete ---\n`);
    }
}
