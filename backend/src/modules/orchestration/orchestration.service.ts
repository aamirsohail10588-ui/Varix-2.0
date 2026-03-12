/**
 * SERVICE: Orchestration Engine
 * PATH: src/modules/orchestration/orchestration.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { orchestrationQueue } from "../../infrastructure/queue";
import { Prisma } from "@prisma/client";

export type WorkflowStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export class OrchestrationService {
    /**
     * Start a new workflow run
     */
    static async startWorkflow(
        tenantId: string,
        workflowName: string,
        metadata?: any
    ) {
        const run = await prisma.workflowRun.create({
            data: {
                tenant_id: tenantId,
                workflow_name: workflowName,
                status: "RUNNING",
                started_at: new Date(),
                metadata: metadata as Prisma.InputJsonValue
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId,
                action: "WORKFLOW_STARTED",
                entityType: "WorkflowRun",
                entityId: run.id,
                details: { workflowName }
            }
        });

        return run;
    }

    /**
     * Add a task to a workflow run
     */
    static async addTask(
        runId: string,
        taskName: string,
        taskType: string,
        inputData?: any,
        dependencies: string[] = []
    ) {
        const task = await prisma.workflowTask.create({
            data: {
                run_id: runId,
                task_name: taskName,
                task_type: taskType,
                status: "PENDING",
                input_data: inputData as Prisma.InputJsonValue
            }
        });

        for (const depId of dependencies) {
            await prisma.workflowTaskDependency.create({
                data: {
                    predecessorId: depId,
                    successorId: task.id
                }
            });
        }

        // If no dependencies, we can queue it immediately
        if (dependencies.length === 0) {
            await this.enqueueTask(task.id);
        }

        return task;
    }

    /**
     * Enqueue a task for background execution
     */
    static async enqueueTask(taskId: string) {
        await prisma.workflowTask.update({
            where: { id: taskId },
            data: { status: "QUEUED" }
        });

        await orchestrationQueue.add("execute-task", { taskId });
    }

    /**
     * Finalize a task and trigger successors if applicable
     */
    static async completeTask(taskId: string, outputData?: any) {
        const task = await prisma.workflowTask.update({
            where: { id: taskId },
            data: {
                status: "COMPLETED",
                completed_at: new Date(),
                output_data: outputData as Prisma.InputJsonValue
            },
            include: {
                run: true,
                dependenciesAsPredecessor: {
                    include: { successor: true }
                }
            }
        });

        // Check if all successors can now run
        for (const dep of task.dependenciesAsPredecessor) {
            const successor = dep.successor;
            const unmetDeps = await prisma.workflowTaskDependency.count({
                where: {
                    successorId: successor.id,
                    predecessor: { NOT: { status: "COMPLETED" } }
                }
            });

            if (unmetDeps === 0 && successor.status === "PENDING") {
                await this.enqueueTask(successor.id);
            }
        }

        // Check if entire workflow is complete
        const incompleteTasks = await prisma.workflowTask.count({
            where: {
                run_id: task.run_id,
                NOT: { status: "COMPLETED" }
            }
        });

        if (incompleteTasks === 0) {
            await prisma.workflowRun.update({
                where: { id: task.run_id },
                data: {
                    status: "COMPLETED",
                    completed_at: new Date()
                }
            });
        }
    }

    /**
     * Handle task failure and retries
     */
    static async failTask(taskId: string, errorMessage: string) {
        const task = await prisma.workflowTask.findUnique({
            where: { id: taskId },
            include: { run: true }
        });

        if (!task) return;

        if (task.retry_count < task.max_retries) {
            await prisma.workflowTask.update({
                where: { id: taskId },
                data: {
                    status: "RETRYING",
                    retry_count: { increment: 1 },
                    error_message: errorMessage
                }
            });

            // Exponential backoff delay
            const delay = Math.pow(2, task.retry_count) * 1000;
            await orchestrationQueue.add("execute-task", { taskId }, { delay });
        } else {
            await prisma.workflowTask.update({
                where: { id: taskId },
                data: {
                    status: "FAILED",
                    completed_at: new Date(),
                    error_message: errorMessage
                }
            });

            await prisma.workflowRun.update({
                where: { id: task.run_id },
                data: {
                    status: "FAILED",
                    completed_at: new Date(),
                    error_message: `Task ${task.task_name} failed: ${errorMessage}`
                }
            });
        }
    }
}
