import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../infrastructure/prisma';
import { config } from '../../infrastructure/config';
// @ts-ignore
const { authenticator } = require('otplib');

export class AuthService {
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    async generateTokenPair(userOrId: any, tenantId?: string, ip?: string, userAgent?: string) {
        const userId =
            typeof userOrId === "string"
                ? userOrId
                : userOrId.userId;
        const role = typeof userOrId === 'object' ? userOrId.role : undefined;

        const accessToken = jwt.sign(
            { userId, tenantId, role },
            config.jwtSecret,
            { expiresIn: '1h' }
        );
        const refreshToken = jwt.sign(
            { userId, nonce: crypto.randomBytes(16).toString('hex') },
            config.jwtSecret,
            { expiresIn: '7d' }
        );

        try {
            await prisma.session.create({
                data: {
                    userId,
                    token: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    ipAddress: ip,
                    userAgent: userAgent,
                    tenantId: tenantId
                }
            });
        } catch (e: any) {
            console.warn("Session recording skipped:", e.message);
        }

        return { accessToken, refreshToken };
    }

    generateMfaSecret(email: string) {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(email, 'VARIX', secret);
        return { secret, otpauth };
    }

    verifyMfaToken(token: string, secret: string) {
        return authenticator.verify({ token, secret });
    }

    async refreshAccessToken(refreshToken: string, ip?: string, userAgent?: string) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string };
            const session = await prisma.session.findFirst({
                where: { refreshToken: refreshToken, userId: decoded.userId }
            });

            if (!session || session.expiresAt < new Date()) {
                throw new Error("Invalid or expired refresh token");
            }

            const accessToken = jwt.sign(
                { userId: decoded.userId, tenantId: session.tenantId },
                config.jwtSecret,
                { expiresIn: '1h' }
            );
            return { accessToken };
        } catch (e: any) {
            throw new Error("Invalid refresh token");
        }
    }

    async createApiKey(tenantId: string, name: string) {
        const key = crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');
        const prefix = key.substring(0, 8);

        const created = await prisma.apiKey.create({
            data: {
                keyHash,
                prefix,
                name,
                tenantId
            }
        });

        return { ...created, key };
    }

    async createServiceAccount(tenantId: string, name: string) {
        const clientId = crypto.randomBytes(16).toString('hex');
        const clientSecret = crypto.randomBytes(32).toString('hex');
        const secretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

        const created = await prisma.serviceAccount.create({
            data: {
                clientId,
                secretHash,
                name,
                tenantId
            }
        });

        return { ...created, clientSecret };
    }
}

export const authService = new AuthService();
