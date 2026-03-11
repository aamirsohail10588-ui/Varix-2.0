import app from "./app";

const port = process.env.PORT || 4000;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    const fs = require("fs");
    const path = require("path");

    const logPath = path.join(process.cwd(), "logs", "debug.log");

    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[UNCAUGHT] ${err.stack}\n`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    const fs = require("fs");
    const path = require("path");

    const logPath = path.join(process.cwd(), "logs", "debug.log");

    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[REJECTION] ${reason}\n`);
});

// Step 5: System Metrics and Health API
app.get("/system/metrics", async (req, res) => {
    const { monitoringService } = await import("./modules/system/monitoring.service");
    await monitoringService.updateSystemMetrics();
    res.json(monitoringService.getMetrics());
});

app.get("/system/worker-health", async (req, res) => {
    const { monitoringService } = await import("./modules/system/monitoring.service");
    res.json({
        report: monitoringService.getHealthReport(),
        timestamp: new Date()
    });
});

const server = app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    // STEP 3: Start Lifecycle Worker
    try {
        const { startCleanupWorker } = await import("./workers/cleanup.worker");
        startCleanupWorker();
    } catch (err) {
        console.error("[Startup] Failed to start cleanup worker:", err);
    }

    // STEP 5 & 6: Startup Maintenance (Indexing & Cleanup)
    try {
        const prisma = (await import("./infrastructure/prisma")).default;

        // 1. Ensure high-performance functional index exists
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_raw_records_account_code 
            ON raw_records ((payload_json->>'account_code'));
        `);

        // 2. Clean up orphaned staging tables (SAFE VERSION)
        const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(`
    SELECT tablename
    FROM pg_tables
    WHERE tablename LIKE 'staging_%'
      AND tablename NOT IN (
          SELECT 'staging_' || replace(id::text,'-','')
          FROM ingestion_batches
          WHERE status IN ('processing','pending')
      )
`);

        for (const { tablename } of tables) {
            await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tablename}"`);
            console.log(`[Startup] Cleaned up orphaned staging table: ${tablename}`);
        }
    } catch (err) {
        console.error("[Startup] Maintenance failed:", err);
    }
});

process.on("SIGINT", () => {
    console.log("Shutting down server...");
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
});
