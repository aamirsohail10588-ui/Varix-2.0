import prisma from "../../infrastructure/prisma";
import crypto from "crypto";
import { analyticsService } from "../analytics/analytics.service";
import { auditService } from "../../services/audit.service";

export class GovernanceService {
    // --- Close Cycle Management ---
    async createCycle(tenantId: string, name: string, startDate: Date, endDate: Date, closeDeadline?: Date) {
        return prisma.closeCycle.create({
            data: {
                tenantId,
                name,
                startDate,
                endDate,
                close_deadline: closeDeadline,
                status: "OPEN"
            }
        });
    }

    async createCloseTask(tenantId: string, cycleId: string, name: string, description?: string, assignedRoleId?: string) {
        return prisma.closeTask.create({
            data: {
                tenantId,
                cycleId,
                name,
                description,
                assignedRoleId,
                status: "PENDING"
            }
        });
    }

    async addTaskDependency(predecessorId: string, successorId: string) {
        return prisma.taskDependency.create({
            data: { predecessorId, successorId }
        });
    }

    async evaluateTaskStatus(taskId: string) {
        const task = await prisma.closeTask.findUnique({
            where: { id: taskId },
            include: { dependenciesAsSuccessor: { include: { predecessor: true } } }
        });
        if (!task) return null;

        let allPredecessorsCompleted = task.dependenciesAsSuccessor.every(dep => dep.predecessor.status === "COMPLETED");

        if (allPredecessorsCompleted && task.status === "BLOCKED") {
            return prisma.closeTask.update({ where: { id: taskId }, data: { status: "PENDING" } });
        }
        if (!allPredecessorsCompleted && task.status !== "BLOCKED" && task.status !== "COMPLETED") {
            return prisma.closeTask.update({ where: { id: taskId }, data: { status: "BLOCKED" } });
        }
        return task;
    }

    async addEvidence(taskId: string, uploadedById: string, fileName: string, fileUrl: string) {
        return prisma.taskEvidence.create({
            data: { taskId, uploadedById, fileName, fileUrl }
        });
    }

    async approveTask(taskId: string, approvedById: string, status: "APPROVED" | "REJECTED", comments?: string) {
        const approval = await prisma.taskApproval.create({
            data: { taskId, approvedById, status, comments }
        });

        if (status === "APPROVED") {
            const task = await prisma.closeTask.update({
                where: { id: taskId },
                data: { status: "COMPLETED" },
                include: { dependenciesAsPredecessor: true }
            });

            for (const dependent of task.dependenciesAsPredecessor) {
                await this.evaluateTaskStatus(dependent.successorId);
            }
            await this.attemptCloseCycle(task.cycleId);
        }

        await auditService.logAction("TASK_APPROVAL", "CloseTask", taskId, { status }, approvedById);
        return approval;
    }

    async attemptCloseCycle(cycleId: string) {
        const cycle = await prisma.closeCycle.findUnique({
            where: { id: cycleId },
            include: { tasks: true }
        });
        if (!cycle) return false;

        const allCompleted = cycle.tasks.every((t: any) => t.status === "COMPLETED");
        if (allCompleted) {
            await prisma.closeCycle.update({ where: { id: cycleId }, data: { status: "CLOSED" } });
            return true;
        }
        return false;
    }

    // --- Control Execution ---
    async executeControls(tenantId: string, snapshotId: string) {
        const specs = await prisma.controlSpec.findMany({ where: { tenantId, isActive: true } });
        if (specs.length === 0) return;

        const run = await prisma.controlRun.create({ data: { tenantId, snapshot_id: snapshotId, status: "RUNNING" } });
        const records = await prisma.rawRecord.findMany({ where: { snapshotId } });
        const results: any[] = [];

        // Simple duplicate & limit checks (Simplified version for modular service)
        const invoiceMap = new Map<string, any>();
        records.forEach(r => {
            const data = r.payload_json as any;
            const inv = data.invoice_number || data.InvoiceNumber;
            const amount = parseFloat(data.amount || data.debit || "0");

            if (inv && amount > 0) {
                if (invoiceMap.has(inv)) {
                    results.push({
                        controlRunId: run.id,
                        control_id: specs.find(s => s.ruleType === "DUPLICATE_INVOICE")?.id || specs[0].id,
                        entity_reference: inv,
                        severity: "ERROR",
                        violation_message: `Duplicate Invoice Detected: ${inv}`,
                    });
                }
                invoiceMap.set(inv, r);
            }
        });

        if (results.length > 0) await prisma.controlResult.createMany({ data: results });
        await prisma.controlRun.update({ where: { id: run.id }, data: { status: "COMPLETED" } });

        // Trigger Analytics
        const d = new Date();
        const period = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
        await analyticsService.calculatePeriodRisk(tenantId, period);
    }

    // --- Snapshot Verification ---
    async getVerifiedSnapshots(tenantId: string) {
        const snapshots = await prisma.snapshot.findMany({
            where: { tenant_id: tenantId },
            orderBy: { snapshot_timestamp: "desc" },
            include: { rawRecords: true }
        });

        return snapshots.map((snap: any) => {
            const hashData = snap.rawRecords.map((r: any) => r.payload_json);
            const calculatedHash = crypto.createHash("sha256").update(JSON.stringify(hashData)).digest("hex");
            const isTampered = snap.status === "PROCESSED" && snap.payload_hash !== calculatedHash;
            const { rawRecords, ...rest } = snap;
            return { ...rest, calculatedHash, isTampered };
        });
    }
}

export const governanceService = new GovernanceService();
