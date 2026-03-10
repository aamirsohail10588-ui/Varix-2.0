import dotenv from "dotenv";

dotenv.config();

export const config = {
    TALLY_DSN: process.env.TALLY_DSN || "TallyODBC_9000",
    VARIX_API_URL: process.env.VARIX_API_URL || "http://localhost:3001",
    TENANT_ID: process.env.TENANT_ID || "",
    API_KEY: process.env.API_KEY || "", // Assume we use an API key or dedicated service token
    USER_EMAIL: process.env.USER_EMAIL || "",
    USER_PASSWORD: process.env.USER_PASSWORD || "", // For fetching JWT token
    SYNC_INTERVAL: process.env.SYNC_INTERVAL || "0 * * * *", // default hourly
    COMPANY_NAME: process.env.COMPANY_NAME || "", // Used to filter if needed
};
