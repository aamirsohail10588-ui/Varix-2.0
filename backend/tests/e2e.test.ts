import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'dummy';

describe('End-to-End System Flow (Section 14)', () => {
    let tenant: any;
    let admin: any;
    let token: string;

    beforeEach(async () => {
        await clearDatabase();
    });

    it('should complete a full financial year cycle simulation', async () => {
        // 1. Create Tenant & User
        tenant = await createTenant('Enterprise E2E Corp');
        admin = await createUser(tenant.id, 'cfo@e2e.com', 'SUPER_ADMIN');
        token = jwt.sign({ userId: admin.id, tenantId: tenant.id }, PRIVATE_KEY, { algorithm: 'RS256' });

        // 2. Ingest Ledger Data
        const ingestionRes = await request(app)
            .post('/api/ingestion/upload')
            .set('Authorization', `Bearer ${token}`)
            .send([
                { date: '2026-03-01', account: '1000', amount: 50000 },
                { date: '2026-03-15', account: '2000', amount: -50000 }
            ]);

        expect(ingestionRes.status).toBe(201);
        const batchId = ingestionRes.body.batchId;

        // 3. Run Controls
        const controlRes = await request(app)
            .post('/api/controls/run')
            .set('Authorization', `Bearer ${token}`)
            .send({ batchId });

        expect(controlRes.status).toBe(200);

        // 4. Run Close Cycle
        const closeCycle = await prisma.closeCycle.create({
            data: {
                tenantId: tenant.id,
                name: 'March 2026 Close',
                startDate: new Date(),
                endDate: new Date(),
                status: 'OPEN'
            }
        });

        // 5. Generate Metrics
        const dashboardRes = await request(app)
            .get('/api/dashboard/metrics')
            .set('Authorization', `Bearer ${token}`);

        expect(dashboardRes.status).toBe(200);
        // expect(dashboardRes.body).toHaveProperty('riskIndex');
    });
});
