import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenantIsolation.middleware";

const router = Router();

// Used to test multi-tenancy access
router.get(
    "/",
    authenticateToken,
    requireTenant,
    async (req: AuthRequest, res) => {
        try {
            const tenantId = (req as any).tenantId;

            const tenantInfo = await prisma.tenant.findUnique({
                where: { id: tenantId },
                include: {
                    users: {
                        include: {
                            role: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });

            res.json({ tenant: tenantInfo });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// GET /api/tenants/audit-logs
router.get(
    "/audit-logs",
    authenticateToken,
    requireTenant,
    async (req: AuthRequest, res) => {
        try {
            const tenantId = (req as any).tenantId;
            const action = req.query.action as string;

            const logs = await prisma.auditLog.findMany({
                where: {
                    tenantId,
                    ...(action ? { action } : {})
                },
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 100
            });

            res.json({ logs });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
);

export default router;
