/**
 * SERVICE: Multi-tenant Job Scheduler
 * PATH: src/modules/orchestration/scheduler.service.ts
 */

import prisma from "../../infrastructure/prisma";
import { OrchestrationService } from "./orchestration.service";
import cronParser from "cron-parser";

export class SchedulerService {
    /**
     * Start the scheduler polling loop
     */
    static start() {
        console.log("[SchedulerService] System Initialized. Polling for pending jobs...");
        setInterval(() => this.pollAndTrigger(), 60000); // Check every minute
    }

    /**
     * Poll database for jobs that need execution
     */
    static async pollAndTrigger() {
        const now = new Date();

        const pendingJobs = await prisma.jobDefinition.findMany({
            where: {
                is_active: true,
                OR: [
                    { next_run_at: null },
                    { next_run_at: { lte: now } }
                ]
            }
        });

        for (const job of pendingJobs) {
            try {
                console.log(`[SchedulerService] Triggering job: ${job.name} for tenant ${job.tenant_id}`);

                // 1. Update next run time immediately to prevent double-trigger
                const interval = cronParser.parseExpression(job.cron_schedule);
                const nextRun = interval.next().toDate();

                await prisma.jobDefinition.update({
                    where: { id: job.id },
                    data: {
                        last_run_at: now,
                        next_run_at: nextRun
                    }
                });

                // 2. Start the workflow
                await OrchestrationService.startWorkflow(
                    job.tenant_id,
                    job.workflow_name,
                    job.config
                );

            } catch (error) {
                console.error(`[SchedulerService] Failed to trigger job ${job.id}:`, error);
            }
        }
    }

    /**
     * Register a new scheduled job
     */
    static async registerJob(
        tenantId: string,
        name: string,
        workflowName: string,
        cronSchedule: string,
        config?: any
    ) {
        const interval = cronParser.parseExpression(cronSchedule);
        const nextRun = interval.next().toDate();

        return prisma.jobDefinition.upsert({
            where: { id: "PLACEHOLDER" }, // This is dummy for upsert logic if not using specific key
            create: {
                tenant_id: tenantId,
                name,
                workflow_name: workflowName,
                cron_schedule: cronSchedule,
                next_run_at: nextRun,
                config: config || {}
            },
            update: {
                cron_schedule: cronSchedule,
                next_run_at: nextRun,
                config: config || {}
            }
        });
    }
}
