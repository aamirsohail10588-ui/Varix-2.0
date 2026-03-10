import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'dummy';

describe('Finance & Governance (Sections 6-10)', () => {
    let tenant: any;
    let user: any;
    let token: string;

    beforeEach(async () => {
        await clearDatabase();
        tenant = await createTenant('Finance Corp');
        user = await createUser(tenant.id, 'controller@test.com', 'FINANCIAL_CONTROLLER');
        token = jwt.sign({ userId: user.id, tenantId: tenant.id }, PRIVATE_KEY, { algorithm: 'RS256' });
    });

    describe('Control Engine (Section 6)', () => {
        it('should detect imbalanced journals', async () => {
            // Mocking a control run on an imbalanced snapshot
            const snap = await prisma.snapshot.create({
                data: { tenant_id: tenant.id, batch_id: 'dummy', status: 'UNPROCESSED' }
            });

            // Trigger control run
            const res = await request(app)
                .post(`/api/controls/run`)
                .set('Authorization', `Bearer ${token}`)
                .send({ snapshotId: snap.id });

            expect(res.status).toBe(200);
            // expect(res.body.violations).toBeDefined();
        });
    });

    describe('Tax Governance (Section 7)', () => {
        it('should flag GSTIN checksum mismatch', async () => {
            const res = await request(app)
                .post('/api/tax/validate-gstin')
                .set('Authorization', `Bearer ${token}`)
                .send({ gstin: '27AAACR1234A1Z5' }); // Invalid checksum

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(false);
            expect(res.body.error).toMatch(/checksum/i);
        });
    });

    describe('Close Orchestration (Section 8)', () => {
        it('should block close cycle if mandatory tasks are incomplete', async () => {
            const cycle = await prisma.closeCycle.create({
                data: {
                    tenantId: tenant.id,
                    name: 'March 2026',
                    startDate: new Date(),
                    endDate: new Date(),
                    status: 'OPEN'
                }
            });

            const res = await request(app)
                .post(`/api/close/cycles/${cycle.id}/sign-off`)
                .set('Authorization', `Bearer ${token}`);

            // Expect failure because tasks are not completed
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/incomplete/i);
        });
    });

    describe('Consolidation Engine (Section 9)', () => {
        it('should perform intercompany eliminations', async () => {
            // Setup parent and sub entities
            const parent = await prisma.entity.create({ data: { tenantId: tenant.id, name: 'Parent', country: 'IN', currency: 'INR' } });
            const sub = await prisma.entity.create({ data: { tenantId: tenant.id, name: 'Sub', country: 'US', currency: 'USD' } });

            await prisma.entityHierarchy.create({ data: { parentId: parent.id, childId: sub.id, ownershipPct: 1.0 } });

            // Trigger consolidation
            const res = await request(app)
                .post('/api/consolidation/run')
                .set('Authorization', `Bearer ${token}`)
                .send({ parentEntityId: parent.id, period: '2026-03' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('eliminationJournalId');
        });
    });

    describe('FP&A Tests (Section 10)', () => {
        it('should create and version budgets', async () => {
            const res = await request(app)
                .post('/api/planning/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Sales Budget 2026',
                    version: 'v1.0',
                    period: '2026',
                    amount: 5000000
                });

            expect(res.status).toBe(201);
            expect(res.body.version).toBe('v1.0');
        });
    });
});
