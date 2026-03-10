import axios from "axios";
import FormData from "form-data";
import { config } from "./config";

let cachedToken: string | null = null;
let tokenExpiry = 0; // Simple expiry tracking

/**
 * Authenticates with VARIX Backend to obtain a JWT token for the upload session.
 */
async function getAuthToken(): Promise<string> {
    const now = Date.now();
    // Use cached token if valid (assuming 15 mins validity mapping conservatively)
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    try {
        console.log(`[Upload] Authenticating with ${config.VARIX_API_URL}...`);
        const res = await axios.post(`${config.VARIX_API_URL}/api/auth/login`, {
            email: config.USER_EMAIL,
            password: config.USER_PASSWORD
        });

        cachedToken = res.data.token;
        tokenExpiry = now + 15 * 60 * 1000; // 15 minutes buffer
        console.log(`[Upload] Authentication successful.`);
        return cachedToken as string;
    } catch (e: any) {
        console.error(`[Upload] Authentication failed: ${e.message}`);
        throw new Error("Could not authenticate with VARIX backend.");
    }
}

/**
 * Uploads Canonical CSV Buffer to the VARIX ingestion pipeline
 */
export async function uploadCSVBuffer(csvBuffer: Buffer, fileName: string = "tally_export.csv") {
    try {
        const token = await getAuthToken();

        const form = new FormData();
        form.append("file", csvBuffer, {
            filename: fileName,
            contentType: "text/csv"
        });

        console.log(`[Upload] Uploading ${csvBuffer.length} bytes to ${config.VARIX_API_URL}...`);

        const res = await axios.post(`${config.VARIX_API_URL}/api/ingestion/upload`, form, {
            headers: {
                ...form.getHeaders(),
                "Authorization": `Bearer ${token}`
            }
        });

        console.log(`[Upload] Upload complete. Batch ID: ${res.data.batchId}, Status: ${res.data.status}`);
        return res.data;

    } catch (e: any) {
        console.error(`[Upload] Upload failed unexpectedly: ${e.response?.data?.error || e.message}`);
        throw e;
    }
}
