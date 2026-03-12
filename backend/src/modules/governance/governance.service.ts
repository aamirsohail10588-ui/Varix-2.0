/**
 * MODULE: Governance Service
 * PATH: src/modules/governance/governance.service.ts
 */

import prisma from "../../infrastructure/prisma";

export class GovernanceService {
    /**
     * Create a new approval request for an entry or batch
     */
    static async createApprovalRequest(tenantId: string, workflowId: string, entityType: string, entityId: string, requestedById: string) {
        const workflow = await (prisma as any).approvalWorkflow.findUnique({
            where: { id: workflowId }
        });

        if (!workflow) throw new Error("Approval workflow not found");

        const request = await (prisma as any).approvalRequest.create({
            data: {
                tenantId,
                workflowId,
                entityType,
                entityId,
                requestedById,
                status: "PENDING"
            }
        });

        // Initialize steps
        const steps = [];
        for (let i = 1; i <= workflow.steps_count; i++) {
            steps.push({
                requestId: request.id,
                stepOrder: i,
                status: "PENDING"
            });
        }

        await (prisma as any).approvalStep.createMany({
            data: steps
        });

        return request;
    }

    /**
     * Action an approval step
     */
    static async actionStep(requestId: string, stepId: string, approverId: string, status: "APPROVED" | "REJECTED", comments?: string) {
        const step = await (prisma as any).approvalStep.findUnique({
            where: { id: stepId }
        });

        if (!step) throw new Error("Step not found");
        if (step.status !== "PENDING") throw new Error("Step already processed");

        await (prisma as any).approvalStep.update({
            where: { id: stepId },
            data: {
                status,
                approverId,
                comments,
                actionedAt: new Date()
            }
        });

        // Check if all steps approved
        const allSteps = await (prisma as any).approvalStep.findMany({
            where: { requestId }
        });

        if (status === "REJECTED") {
            await (prisma as any).approvalRequest.update({
                where: { id: requestId },
                data: { status: "REJECTED" }
            });
        } else if (allSteps.every((s: any) => s.status === "APPROVED")) {
            // Layer 13: Final Integrity Check
            // In a real system, we'd block if evidence is missing or signatures are broken
            await (prisma as any).approvalRequest.update({
                where: { id: requestId },
                data: { status: "APPROVED" }
            });
        }

        return { success: true };
    }

    /**
     * Link evidence document to an entity
     */
    static async linkEvidence(tenantId: string, entityType: string, entityId: string, fileName: string, fileType: string, fileUrl: string, uploadedById: string, signature?: string) {
        return await (prisma as any).evidenceDocument.create({
            data: {
                tenantId,
                entityType,
                entityId,
                fileName,
                fileType,
                fileUrl,
                digitalSignature: signature,
                version: 1,
                uploadedById
            }
        });
    }

    /**
     * Supersede an existing evidence document with a new version
     */
    static async supersedeEvidence(previousId: string, fileUrl: string, uploadedById: string, signature?: string) {
        const previous = await (prisma as any).evidenceDocument.findUnique({
            where: { id: previousId }
        });

        if (!previous) throw new Error("Previous evidence version not found");

        // Ensure we don't already have a next version
        const existingNext = await (prisma as any).evidenceDocument.findFirst({
            where: { previousVersionId: previousId }
        });
        if (existingNext) throw new Error("Evidence already has a newer version");

        return await (prisma as any).evidenceDocument.create({
            data: {
                tenantId: previous.tenantId,
                entityType: previous.entityType,
                entityId: previous.entityId,
                fileName: previous.fileName,
                fileType: previous.fileType,
                fileUrl,
                digitalSignature: signature,
                version: previous.version + 1,
                previousVersionId: previousId,
                uploadedById
            }
        });
    }

    /**
     * Get pending approvals for a user
     */
    static async getPendingApprovals(approverId: string) {
        // Simple logic: return all steps where this user could potentially be an approver
        // In a real system, we'd check roles/permissions
        return await (prisma as any).approvalStep.findMany({
            where: {
                status: "PENDING",
                // This is a simplification; normally we'd filter by workflow rules
            },
            include: {
                request: true
            }
        });
    }
}
