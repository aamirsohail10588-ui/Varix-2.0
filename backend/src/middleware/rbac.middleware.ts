import { Request, Response, NextFunction } from 'express';
import prisma from "../infrastructure/prisma";

export enum RoleName {
    SUPER_ADMIN = 'SUPER_ADMIN',
    FINANCIAL_CONTROLLER = 'FINANCIAL_CONTROLLER',
    AUDITOR = 'AUDITOR',
    VIEWER = 'VIEWER',
}

/**
 * Middleware to check if the user has the required roles for the current tenant
 */
export const authorize = (allowedRoles: RoleName[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId } = (req as any).user; // Set by authentication middleware

            if (!userId || !tenantId) {
                return res.status(401).json({ error: 'Unauthorized: Missing user or tenant context' });
            }

            const userRole = await prisma.userTenantRole.findFirst({
                where: {
                    userId,
                    tenantId,
                },
                include: {
                    role: true,
                },
            });

            if (!userRole || !allowedRoles.includes(userRole.role.name as RoleName)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ error: 'Internal server error during authorization' });
        }
    };
};

/**
 * Middleware for Segregation of Duties (SoD)
 * Example: User who created a batch cannot approve it
 */
export const checkSoD = (action: string, batchIdParam: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId } = (req as any).user;
            const batchId = req.params[batchIdParam] || req.body[batchIdParam];

            if (action === 'APPROVE_BATCH') {
                const batch = await prisma.ingestionBatch.findUnique({
                    where: { id: batchId },
                    select: { createdBy: true }
                });

                if (batch && batch.createdBy === userId) {
                    return res.status(403).json({ error: 'SoD Violation: Creator cannot approve their own batch' });
                }
            }

            next();
        } catch (error) {
            res.status(500).json({ error: 'SoD check failed' });
        }
    };
};

/**
 * Middleware to check if the user has a specific permission
 */
export const requirePermission = (permissionName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, tenantId } = (req as any).user;

            if (!userId || !tenantId) {
                return res.status(401).json({ error: 'Unauthorized context' });
            }

            const userWithPermissions = await prisma.userTenantRole.findFirst({
                where: { userId, tenantId },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            });

            const permissions = userWithPermissions?.role.permissions.map(p => p.permission.name) || [];

            if (!permissions.includes(permissionName) && !permissions.includes('*')) {
                return res.status(403).json({ error: `Forbidden: Missing permission ${permissionName}` });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Internal server error during permission check' });
        }
    };
};
