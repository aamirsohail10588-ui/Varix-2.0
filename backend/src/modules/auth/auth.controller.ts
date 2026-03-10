/**
 * MODULE: Auth Controller
 * PATH: src/modules/auth/auth.controller.ts
 * VERSION: 2.0.0
 * STATUS: ACTIVE
 */

import { Request, Response } from "express";
import { authService } from "./auth.service";
import prisma from "../../infrastructure/prisma";
import { auditService } from "../../services/audit.service";

// All permissions a SUPER_ADMIN role receives on registration
const SUPER_ADMIN_PERMISSIONS = [
    "*",
    "view:reports",
    "view:close_cycles",
    "manage:close_cycles",
    "approve:close_tasks",
    "view:ingestion",
    "manage:ingestion",
    "view:governance",
    "manage:governance",
    "view:analytics",
    "manage:analytics",
    "view:users",
    "manage:users",
];

export class AuthController {

    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, name, tenantName } = req.body as {
                email: string;
                password: string;
                name?: string;
                tenantName?: string;
            };

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                res.status(400).json({ error: "User already exists" });
                return;
            }

            const hashedPassword = await authService.hashPassword(password);

            // 1. Create tenant
            const tenant = await prisma.tenant.create({
                data: { name: tenantName || "Default Workspace" },
            });

            // 2. Create SUPER_ADMIN role for this tenant
            const role = await prisma.role.create({
                data: { name: "SUPER_ADMIN", tenantId: tenant.id },
            });

            // 3. Seed all permissions and attach to role
            for (const permName of SUPER_ADMIN_PERMISSIONS) {
                const permission = await prisma.permission.upsert({
                    where: { name: permName },
                    update: {},
                    create: { name: permName },
                });

                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
            }

            // 4. Create user and link to tenant + role
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    tenants: {
                        create: { tenantId: tenant.id, roleId: role.id },
                    },
                },
                include: {
                    tenants: { include: { tenant: true, role: true } },
                },
            });

            // 5. Generate token pair
            const userRole = user.tenants?.[0]?.role?.name;

            const { accessToken, refreshToken } = await authService.generateTokenPair(
                {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: userRole
                },
                tenant.id,
                req.ip,
                req.get("user-agent")
            );

            res.status(201).json({
                user,
                tenantId: tenant.id,
                accessToken,
                refreshToken
            });
        } catch (error: unknown) {
            console.error("Registration error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, mfaToken } = req.body as {
                email: string;
                password: string;
                mfaToken?: string;
            };

            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    tenants: { include: { tenant: true, role: true } },
                },
            });

            if (!user) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }

            const isMatch = await authService.verifyPassword(password, user.password);
            if (!isMatch) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }

            if (user.mfaEnabled && user.mfaSecret) {
                if (!mfaToken) {
                    res.status(200).json({ mfaRequired: true, userId: user.id });
                    return;
                }
                const isMfaValid = authService.verifyMfaToken(mfaToken, user.mfaSecret);
                if (!isMfaValid) {
                    res.status(401).json({ error: "Invalid MFA token" });
                    return;
                }
            }

            const tenantId = user.tenants[0]?.tenantId;

            const userRole = user.tenants?.[0]?.role?.name;

            const { accessToken, refreshToken } = await authService.generateTokenPair(
                {
                    userId: user.id,
                    tenantId,
                    role: userRole
                },
                tenantId,
                req.ip,
                req.get("user-agent")
            );

            await auditService.logAction(
                "LOGIN",
                "User",
                user.id,
                { email: user.email },
                user.id,
                tenantId
            );

            res.json({
                user,
                tenantId,
                accessToken,
                refreshToken
            });
        } catch (error: unknown) {
            console.error("Login error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body as { refreshToken: string };

            if (!refreshToken) {
                res.status(400).json({ error: "Refresh token is required" });
                return;
            }

            const result = await authService.refreshAccessToken(
                refreshToken,
                req.ip,
                req.get("user-agent")
            );

            res.json(result);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Invalid refresh token";
            res.status(401).json({ error: message });
        }
    }

    async setupMfa(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.body as { userId: string };
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            const { secret, otpauth } = authService.generateMfaSecret(user.email);

            await prisma.user.update({
                where: { id: userId },
                data: { mfaSecret: secret },
            });

            res.json({ secret, otpauth });
        } catch (error: unknown) {
            res.status(500).json({ error: "MFA setup failed" });
        }
    }

    async verifyMfa(req: Request, res: Response): Promise<void> {
        try {
            const { userId, mfaToken } = req.body as {
                userId: string;
                mfaToken: string;
            };

            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user || !user.mfaSecret) {
                res.status(400).json({ error: "MFA not set up" });
                return;
            }

            const isValid = authService.verifyMfaToken(mfaToken, user.mfaSecret);

            if (isValid) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { mfaEnabled: true },
                });
                res.json({ success: true });
            } else {
                res.status(401).json({ error: "Invalid token" });
            }
        } catch (error: unknown) {
            res.status(500).json({ error: "MFA verification failed" });
        }
    }

    async createApiKey(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, name, userId } = req.body as {
                tenantId: string;
                name: string;
                userId: string;
            };

            const result = await authService.createApiKey(tenantId, name);

            await auditService.logAction(
                "CREATE_API_KEY",
                "ApiKey",
                result.id,
                { name },
                userId,
                tenantId
            );

            res.status(201).json(result);
        } catch (error: unknown) {
            res.status(500).json({ error: "Failed to create API key" });
        }
    }

    async createServiceAccount(req: Request, res: Response): Promise<void> {
        try {
            const { tenantId, name, userId } = req.body as {
                tenantId: string;
                name: string;
                userId: string;
            };

            const result = await authService.createServiceAccount(tenantId, name);

            await auditService.logAction(
                "CREATE_SERVICE_ACCOUNT",
                "ServiceAccount",
                result.id,
                { name },
                userId,
                tenantId
            );

            res.status(201).json(result);
        } catch (error: unknown) {
            res.status(500).json({ error: "Failed to create Service Account" });
        }
    }

    async getCurrentUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    tenants: {
                        include: {
                            tenant: true,
                            role: true
                        }
                    }
                }
            });

            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            // Sanitize user object
            const sanitizedUser = { ...user } as any;
            delete sanitizedUser.password;
            delete sanitizedUser.mfaSecret;

            res.json({ user: sanitizedUser });
        } catch (error: unknown) {
            console.error("GetCurrentUser error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export const authController = new AuthController();