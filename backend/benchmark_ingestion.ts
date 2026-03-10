import { csvIngestionPipeline } from "./src/pipelines/csvIngestion.pipeline";
import prisma from "./src/infrastructure/prisma";
import { v4 as uuidv4 } from "uuid";
import path from "path";

async function runBenchmark() {
    const filePath = process.argv[2] || path.join(__dirname, "..", "varix.csv");
    const tenantId = (await prisma.tenant.findFirst())?.id;

    if (!tenantId) {
        console.error("No tenant found in database. Create a tenant first.");
        process.exit(1);
    }

    const batchId = uuidv4();
    console.log(`[Benchmark] Starting 1M row ingestion benchmark...`);
    console.log(`[Benchmark] File: ${filePath}`);
    console.log(`[Benchmark] Tenant: ${tenantId}`);
    console.log(`[Benchmark] Batch: ${batchId}`);

    const start = Date.now();

    try {
        const result = await csvIngestionPipeline.processExtremeScale(filePath, tenantId, batchId);
        const duration = (Date.now() - start) / 1000;
        const throughput = (1000000 / duration).toFixed(0);

        const summary = `BENCHMARK_RESULT: ${duration.toFixed(2)}s | ${throughput} rows/sec`;
        console.log(summary);
        require("fs").writeFileSync("benchmark_summary.txt", summary);

        console.log(`\n🚀 BENCHMARK COMPLETE`);
        console.log(`------------------------------`);
        console.log(`Total Rows: 1,000,000`);
        console.log(`Total Time: ${duration.toFixed(2)} seconds`);
        console.log(`Throughput: ${(1000000 / duration).toFixed(0)} rows/sec`);
        console.log(`------------------------------`);
        console.log(`Snapshot ID: ${result.snapshotId}`);

        // Wait a bit to ensure async tasks (like progress updates) are logged
        await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
        console.error("[Benchmark] Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runBenchmark();
