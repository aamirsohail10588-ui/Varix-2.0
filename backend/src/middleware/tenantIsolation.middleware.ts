import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import prisma, { setTenantContext } from "../infrastructure/prisma";
import { redis } from "../infrastructure/redis";

export const requireTenant = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const tenantId = req.headers["x-tenant-id"] as string;
        const userId = req.user?.userId;

        if (!tenantId) {
            return res.status(400).json({ error: "Missing x-tenant-id header" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const cacheKey = `tenant_access:${userId}:${tenantId}`;

        // 1. Check Redis cache first
        try {
            const cachedAccess = await redis.get(cacheKey);
            if (cachedAccess) {
                const { roleId } = JSON.parse(cachedAccess);

                (req as any).tenantId = tenantId;
                (req as any).roleId = roleId;
                return next();
            }
        } catch (cacheError) {
            console.error("Redis Cache Error:", cacheError);
            // Fallback to database on cache error
        }

        // 2. Cache miss: Verify the user has access to this specific tenant using database
        const userRole = await prisma.$transaction(async (tx) => {
            // Set PostgreSQL RLS context within transaction
            await setTenantContext(tenantId, tx);

            return await tx.userTenantRole.findFirst({
                where: {
                    userId,
                    tenantId,
                },
                include: {
                    role: true,
                },
            });
        });

        if (!userRole) {
            return res
                .status(403)
                .json({ error: "Forbidden: You do not have access to this workspace." });
        }

        // 3. Store result in Redis for future requests (TTL 600s)
        try {
            await redis.set(
                cacheKey,
                JSON.stringify({ roleId: userRole.role.id }),
                "EX",
                600
            );
        } catch (cacheError) {
            console.error("Redis Cache Set Error:", cacheError);
        }

        // Attach tenant context to the request for downstream processing
        (req as any).tenantId = tenantId;
        (req as any).roleId = userRole.role.id;

        next();
    } catch (error) {
        console.error("Tenant Isolation Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
