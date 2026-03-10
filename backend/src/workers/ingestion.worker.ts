import { Worker } from "bullmq";
import IORedis from "ioredis";
import prisma from "../infrastructure/prisma";
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

            await prisma.ingestionBatch.update({
                where: { id: batchId },
                data: { status: "processing" }
            });

            if (fileType === "CSV") {

                await ingestionQueue.add("ingest-csv", {
                    filePath,
                    tenantId,
                    batchId,
                    fileType: "CSV"
                });

            } else {

                await ingestionService.processExcel(
                    filePath,
                    tenantId,
                    batchId
                );

            }

            await prisma.ingestionBatch.update({
                where: { id: batchId },
                data: { status: "completed" }
            });

            console.log(`[IngestionWorker] Batch ${batchId} SUCCESS`);

        } catch (error) {

            console.error(`[IngestionWorker] Batch ${batchId} FAILED`, error);

            await prisma.ingestionBatch.update({
                where: { id: batchId },
                data: { status: "failed" }
            });

        }

    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});