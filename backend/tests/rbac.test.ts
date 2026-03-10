import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'dummy';

describe('RBAC & SoD (Section 2)', () => {
    let tenant: any;
    let adminUser: any;
    let viewerUser: any;
    let adminToken: string;
    let viewerToken: string;

    beforeEach(async () => {
        await clearDatabase();
        tenant = await createTenant('RBAC Corp');

        adminUser = await createUser(tenant.id, 'admin@rbac.com', 'SUPER_ADMIN');
        viewerUser = await createUser(tenant.id, 'viewer@rbac.com', 'VIEWER');

        adminToken = jwt.sign({ userId: adminUser.id, tenantId: tenant.id }, PRIVATE_KEY, { algorithm: 'RS256' });
        viewerToken = jwt.sign({ userId: viewerUser.id, tenantId: tenant.id }, PRIVATE_KEY, { algorithm: 'RS256' });
    });

    it('should block non-admin from creating API keys', async () => {
        const res = await request(app)
            .post('/api/auth/api-keys')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({
                tenantId: tenant.id,
                name: 'Forbidden Key',
                userId: viewerUser.id
            });

        // The current routes might not all have authorize() applied yet.
        // This test serves as an audit check. 
        // If it passes (blocks), good. If it fails (allows), we flag it.
        expect(res.status).toBe(403);
    });

    it('should enforce Segregation of Duties (SoD): Creator cannot approve own batch', async () => {
        // Create a batch with createdBy = adminUser.id
        const batch = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenant.id,
                source_type: 'API',
                file_name: 'test.csv',
                status: 'pending',
                createdBy: adminUser.id
            }
        });

        // Try to approve it as the same user
        // We'll use a hypothetical or real endpoint that uses checkSoD middleware
        // For demonstration of the framework, we assume /api/ingestion/batches/:id/approve exists
        const res = await request(app)
            .post(`/api/ingestion/batches/${batch.id}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/SoD Violation/i);
    });
});
