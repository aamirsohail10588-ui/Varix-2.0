import prisma from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const createTenant = async (name: string = 'Test Tenant') => {
    return await prisma.tenant.create({
        data: {
            name,
        },
    });
};

export const createUser = async (tenantId: string, email: string, role: string = 'TENANT_OWNER') => {
    const password = await bcrypt.hash('Password123!', 12);
    const user = await prisma.user.create({
        data: {
            email,
            name: email.split('@')[0],
            password,
        },
    });

    // Assign role
    const roleModel = await prisma.role.findFirst({
        where: { name: role, tenantId }
    }) || await prisma.role.create({
        data: {
            name: role,
            tenantId
        }
    });

    await prisma.userTenantRole.create({
        data: {
            userId: user.id,
            tenantId,
            roleId: roleModel.id,
        },
    });

    return user;
};

export const createSession = async (userId: string, tenantId: string) => {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return await prisma.session.create({
        data: {
            userId,
            tenantId,
            token: crypto.randomBytes(40).toString('hex'),
            refreshToken,
            expiresAt
        }
    });
};
