import cron from "node-cron";
import { executeDeltaSync } from "./sync";
import { config } from "./config";

console.log(`===============================================`);
console.log(`       VARIX Tally Connector Agent initialized`);
console.log(`===============================================`);
console.log(`Tenant ID:     ${config.TENANT_ID}`);
console.log(`Tally DSN:     ${config.TALLY_DSN}`);
console.log(`Sync Interval: ${config.SYNC_INTERVAL}`);
console.log(`API Target:    ${config.VARIX_API_URL}`);
console.log(`===============================================`);

// Run immediately on boot
executeDeltaSync().catch(err => {
    console.error(`[Agent] Initial sync failed: ${err.message}`);
});

// Schedule subsequent runs
cron.schedule(config.SYNC_INTERVAL, () => {
    executeDeltaSync().catch(err => {
        console.error(`[Agent] Scheduled sync failed: ${err.message}`);
    });
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log(`\n[Agent] Shutting down gracefully...`);
    process.exit(0);
});
