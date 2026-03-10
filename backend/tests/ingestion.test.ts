import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'dummy';

describe('Ingestion & Delta Engine (Sections 4 & 5)', () => {
    let tenant: any;
    let user: any;
    let token: string;

    beforeEach(async () => {
        await clearDatabase();
        tenant = await createTenant('Ingestion Corp');
        user = await createUser(tenant.id, 'ingestor@test.com', 'FINANCIAL_CONTROLLER');
        token = jwt.sign({ userId: user.id, tenantId: tenant.id }, PRIVATE_KEY, { algorithm: 'RS256' });
    });

    it('should handle API ingestion with payload integrity verification', async () => {
        const payload = [
            { date: '2026-03-01', account: '1001', debit: 500, credit: 0 },
            { date: '2026-03-01', account: '2001', debit: 0, credit: 500 }
        ];
        const payloadStr = JSON.stringify(payload);
        const hash = crypto.createHash('sha256').update(payloadStr).digest('hex');

        const res = await request(app)
            .post('/api/ingestion/upload')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Payload-Hash', hash)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('batchId');

        const batch = await prisma.ingestionBatch.findUnique({
            where: { id: res.body.batchId }
        });
        expect(batch).toBeDefined();
        expect(batch?.status).toBe('completed');
    });

    it('should detect deltas between snapshots', async () => {
        // 1. First Ingestion
        const batch1 = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenant.id,
                source_type: 'API',
                file_name: 'v1.json',
                status: 'completed'
            }
        });

        const snap1 = await prisma.snapshot.create({
            data: {
                tenant_id: tenant.id,
                batch_id: batch1.id,
                record_count: 1,
                status: 'PROCESSED'
            }
        });

        await prisma.rawRecord.create({
            data: {
                batch_id: batch1.id,
                snapshotId: snap1.id,
                payload_json: { id: 'TX1', amount: 100 }
            }
        });

        // 2. Second Ingestion (Modified record)
        const batch2 = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenant.id,
                source_type: 'API',
                file_name: 'v2.json',
                status: 'completed'
            }
        });

        const snap2 = await prisma.snapshot.create({
            data: {
                tenant_id: tenant.id,
                batch_id: batch2.id,
                record_count: 1,
                status: 'PROCESSED'
            }
        });

        await prisma.rawRecord.create({
            data: {
                batch_id: batch2.id,
                snapshotId: snap2.id,
                payload_json: { id: 'TX1', amount: 120 } // Changed from 100 to 120
            }
        });

        // 3. Trigger Delta Detection
        // In VARIX, this might happen automatically or via a route
        const res = await request(app)
            .get(`/api/changes/compare/${snap1.id}/${snap2.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.changes).toBeDefined();

        const modified = res.body.changes.filter((c: any) => c.change_type === 'RECORD_MODIFIED');
        expect(modified.length).toBeGreaterThan(0);
        expect(modified[0].entity_id).toBe('TX1');
    });

    it('should reject corrupt payloads (hash mismatch)', async () => {
        const res = await request(app)
            .post('/api/ingestion/upload')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Payload-Hash', 'invalid_hash')
            .send([{ data: 'test' }]);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/integrity/i);
    });
});
