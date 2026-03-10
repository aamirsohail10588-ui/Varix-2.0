import prisma from "../infrastructure/prisma";
import crypto from "crypto";

export class AuditService {
    async logAction(
        action: string,
        entityType?: string,
        entityId?: string,
        details?: any,
        userId?: string,
        tenantId?: string
    ) {
        try {
            const latestLog = await prisma.auditLog.findFirst({
                orderBy: { createdAt: "desc" }
            });

            const prevHash = latestLog?.hash || "0000000000000000000000000000000000000000000000000000000000000000";

            const payload = JSON.stringify({
                tenantId,
                userId,
                action,
                entityType,
                entityId,
                details,
                prevHash
            });

            const hash = crypto.createHash("sha256").update(payload).digest("hex");

            return await prisma.auditLog.create({
                data: {
                    tenantId,
                    userId,
                    action,
                    entityType,
                    entityId,
                    details,
                    hash,
                    prevHash
                }
            });
        } catch (error) {
            console.error("Failed to commit audit log. Fatal Error:", error);
            throw new Error("Audit log failure.");
        }
    }
}

export const auditService = new AuditService();
// Backward compatibility
export const logAuditAction = (a: any, b: any, c: any, d: any, e: any, f: any) => auditService.logAction(a, b, c, d, e, f);
