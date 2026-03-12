import { SchedulerService } from "../modules/orchestration/scheduler.service";
import prisma from "../infrastructure/prisma";
import { analyticsService } from "../modules/analytics/analytics.service";

export const startCronJobs = () => {
    // Start the new Enterprise Scheduler
    SchedulerService.start();

    console.log("[SchedulerService] Enterprise Jobs initialized successfully.");
};
