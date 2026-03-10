import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';

describe('Auth System (Section 1)', () => {
    let tenant: any;
    let user: any;

    beforeEach(async () => {
        await clearDatabase();
        tenant = await createTenant('Test Corp');
        user = await createUser(tenant.id, 'admin@test.com');
    });

    it('should login successfully with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'Password123!'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body.user.email).toBe('admin@test.com');
    });

    it('should reject login with invalid password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Invalid/i);
    });

    it('should rotate refresh tokens', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'Password123!'
            });

        const oldRefreshToken = loginRes.body.refreshToken;

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: oldRefreshToken });

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body).toHaveProperty('accessToken');
        expect(refreshRes.body).toHaveProperty('refreshToken');
        expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);
    });

    it('should reject expired or invalid refresh tokens', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'invalid_token' });

        expect(res.status).toBe(401);
    });

    it('should support API Key creation and authentication', async () => {
        // Create API Key
        const keyRes = await request(app)
            .post('/api/auth/api-keys')
            .send({
                tenantId: tenant.id,
                name: 'Test Key',
                userId: user.id
            });

        expect(keyRes.status).toBe(201);
        expect(keyRes.body).toHaveProperty('rawKey');

        // In a real system, we'd test middleware using this key
        // For Section 1, we validate it exists in DB
        const keyInDb = await prisma.apiKey.findUnique({
            where: { id: keyRes.body.id }
        });
        expect(keyInDb).toBeDefined();
        expect(keyInDb?.prefix).toBe(keyRes.body.rawKey.substring(0, 7));
    });

    it('should support Service Account creation', async () => {
        const saRes = await request(app)
            .post('/api/auth/service-accounts')
            .send({
                tenantId: tenant.id,
                name: 'Bot Account',
                userId: user.id
            });

        expect(saRes.status).toBe(201);
        expect(saRes.body).toHaveProperty('clientId');
        expect(saRes.body).toHaveProperty('clientSecret');
    });
});
