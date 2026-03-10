import odbc from "odbc";
import { config } from "./config";

let connection: odbc.Connection | null = null;

export async function connectToTally() {
    if (connection) return connection;
    try {
        console.log(`[Tally] Connecting via DSN: ${config.TALLY_DSN}`);
        connection = await odbc.connect(`DSN=${config.TALLY_DSN}`);
        console.log(`[Tally] Connected successfully.`);
        return connection;
    } catch (e: any) {
        console.error(`[Tally] Connection failed: ${e.message}`);
        throw e;
    }
}

export async function fetchVouchers(lastSyncAlterId: number = 0) {
    const conn = await connectToTally();

    // Tally ODBC limits queries, select key fields. 
    // Usually Tally ODBC requires specific field selects over Select * for performance and compatibility.
    // Fetching Date, VoucherTypeName, VoucherNumber, PartyLedgerName, Amount. We also fetch AlterId.
    // AlterId is critical for Delta Sync.
    const query = `SELECT $AlterId, $Date, $VoucherTypeName, $VoucherNumber, $PartyLedgerName, $Amount FROM Voucher WHERE $AlterId > ${lastSyncAlterId}`;

    try {
        console.log(`[Tally] Fetching vouchers (AlterId > ${lastSyncAlterId})`);
        const result = await conn.query(query);
        console.log(`[Tally] Fetched ${result.length} vouchers.`);
        return result;
    } catch (e: any) {
        console.error(`[Tally] Failed fetching vouchers: ${e.message}`);
        throw e;
    }
}

export async function getLatestAlterId() {
    const conn = await connectToTally();
    try {
        const result = await conn.query(`SELECT Max($AlterId) as MaxAlterId FROM Voucher`);
        if (result && result.length > 0) {
            return Number((result[0] as any).MaxAlterId) || 0;
        }
        return 0;
    } catch (e: any) {
        // Some older tally ODBC versions might not support MAX natively
        console.log(`[Tally] Max AlterId fallback triggered: ${e.message}`);
        return 0;
    }
}

export async function disconnectTally() {
    if (connection) {
        await connection.close();
        connection = null;
        console.log(`[Tally] Disconnected.`);
    }
}
