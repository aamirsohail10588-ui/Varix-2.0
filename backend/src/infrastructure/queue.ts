import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
    process.env.REDIS_URL || "redis://127.0.0.1:6379",
    { maxRetriesPerRequest: null }
);

export const ingestionQueue = new Queue("ingestion", {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

export const orchestrationQueue = new Queue("orchestration", {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 1, // Retries are handled by OrchestrationService logic
        removeOnComplete: true,
        removeOnFail: false
    }
});