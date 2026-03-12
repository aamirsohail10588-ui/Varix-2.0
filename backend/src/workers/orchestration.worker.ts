/**
 * WORKER: Orchestration Task Executor
 * PATH: src/workers/orchestration.worker.ts
 */

import { Worker } from "bullmq";
import IORedis from "ioredis";
import prisma from "../infrastructure/prisma";
import { OrchestrationService } from "../modules/orchestration/orchestration.service";

const connection = new IORedis(
    process.env.REDIS_URL || "redis://127.0.0.1:6379",
    { maxRetriesPerRequest: null }
);

const worker = new Worker(
    "orchestration",
    async (job) => {
        const { taskId } = job.data;
        const task = await prisma.workflowTask.findUnique({
            where: { id: taskId },
            include: { run: true }
        });

        if (!task) return;

        console.log(`[OrchestrationWorker] Executing Task: ${task.task_name} (Run: ${task.run_id})`);

        try {
            await prisma.workflowTask.update({
                where: { id: taskId },
                data: { status: "RUNNING", started_at: new Date() }
            });

            let output = null;

            // Task Type Dispatcher
            switch (task.task_type) {
                case "INGESTION_SYNC":
                    // Call existing sync service or connector
                    const { syncService } = await import("../services/sync.service");
                    const input = task.input_data as any;
                    output = await syncService.triggerSync(task.run.tenant_id, input.connectorId);
                    break;

                case "FSG_PROPAGATION":
                    const { fsgService } = await import("../modules/analytics/fsg.service");
                    const fsgInput = task.input_data as any;
                    await fsgService.propagateSnapshotsBatch(fsgInput.snapshotId, task.run.tenant_id);
                    break;

                case "HEALTH_REPORT":
                    // Placeholder for future health check task
                    output = { status: "HEALTHY" };
                    break;

                case "CONDITIONING":
                    const { ConditioningService } = await import("../modules/governance/conditioning.service");
                    const conditioningInput = (task.input_data as any) || {};
                    // In a real scenario, we'd loop over records, but for the task, we trigger a repair or bulk condition
                    output = await ConditioningService.conditionLedgerEntry(
                        task.run.tenant_id,
                        conditioningInput.rawData,
                        conditioningInput.sourceSystem || "ORCHESTRATION"
                    );
                    break;

                case "REPAIR":
                    const { RepairService } = await import("../modules/governance/repair.service");
                    const repairInput = (task.input_data as any) || {};
                    if (repairInput?.minConfidence) {
                        const count = await RepairService.bulkRepair(task.run.tenant_id, repairInput.minConfidence);
                        output = { repairedCount: count };
                    } else {
                        throw new Error("Repair task requires 'minConfidence' in input_data.");
                    }
                    break;

                default:
                    throw new Error(`Unknown task type: ${task.task_type}`);
            }

            await OrchestrationService.completeTask(taskId, output);
            console.log(`[OrchestrationWorker] Task ${task.task_name} COMPLETED`);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[OrchestrationWorker] Task ${task.task_name} FAILED:`, message);
            await OrchestrationService.failTask(taskId, message);
        }
    },
    { connection: connection as any }
);

worker.on("failed", (job, err) => {
    console.error(`[OrchestrationWorker] Job ${job?.id} failed:`, err.message);
});
