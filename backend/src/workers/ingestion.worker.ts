import { Worker } from "bullmq";
import IORedis from "ioredis";
import { ingestionService } from "../modules/ingestion/ingestion.service";
import { csvIngestionPipeline } from "../pipelines/csvIngestion.pipeline";
import { ingestionQueue } from "../infrastructure/queue";

const connection = new IORedis(
    process.env.REDIS_URL || "redis://127.0.0.1:6379",
    {
        maxRetriesPerRequest: null
    }
);

const worker = new Worker(
    "ingestion",
    async (job) => {
        const { batchId, tenantId, filePath, fileType } = job.data;

        console.log(`[IngestionWorker] Processing Batch ${batchId}`);

        try {
            // State: VALIDATING is handled inside the pipeline or process methods

            if (fileType === "CSV") {
                // For extreme scale, the pipeline handles everything
                await csvIngestionPipeline.processExtremeScale(
                    filePath,
                    tenantId,
                    batchId
                );
            } else {
                // For Excel, we use the service
                await ingestionService.transitionState(batchId, "VALIDATING");
                await ingestionService.processExcel(
                    filePath,
                    tenantId,
                    batchId
                );
                await ingestionService.transitionState(batchId, "COMMITTED");
            }

            console.log(`[IngestionWorker] Batch ${batchId} SUCCESS`);
        } catch (error) {
            console.error(`[IngestionWorker] Batch ${batchId} FAILED`, error);
            // Failure is handled in catch blocks of called methods usually, 
            // but we ensure it's marked failed here if it wasn't.
            await ingestionService.transitionState(batchId, "FAILED", {
                error: error instanceof Error ? error.message : "Background job failed"
            }).catch(() => { });
        }
    },
    { connection: connection as any }
);

worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});