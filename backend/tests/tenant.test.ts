import request from 'supertest';
import app from '../src/app';
import { clearDatabase } from './setup';
import { createTenant, createUser } from './factories';
import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'dummy';

describe('Tenant Isolation (Section 3)', () => {
    let tenants: any[] = [];
    let users: any[] = [];
    let tokens: string[] = [];

    beforeEach(async () => {
        await clearDatabase();
        tenants = [];
        users = [];
        tokens = [];

        // Simulate 5 tenants
        for (let i = 1; i <= 5; i++) {
            const t = await createTenant(`Tenant ${i}`);
            const u = await createUser(t.id, `user${i}@tenant${i}.com`);
            const token = jwt.sign({ userId: u.id, tenantId: t.id }, PRIVATE_KEY, { algorithm: 'RS256' });

            tenants.push(t);
            users.push(u);
            tokens.push(token);
        }
    });

    it('should strictly isolate data between tenants', async () => {
        // 1. Tenant 1 creates a ledger entry
        const account1 = await prisma.account.create({
            data: {
                tenantId: tenants[0].id,
                code: '1001',
                name: 'Cash',
                type: 'ASSET'
            }
        });

        await prisma.ledgerEntry.create({
            data: {
                tenant_id: tenants[0].id,
                transaction_date: new Date(),
                account_id: account1.id,
                debit_amount: 1000,
                credit_amount: 0
            }
        });

        // 2. Tenant 2 tries to access Tenant 1's ledger entries
        // We use a route that should be scoped by tenant_id (middleware enforced)
        const res = await request(app)
            .get('/api/ledger')
            .set('Authorization', `Bearer ${tokens[1]}`); // Token for Tenant 2

        expect(res.status).toBe(200);

        // If the API is correctly scoped, it should return 0 entries for Tenant 2
        // because Tenant 2 has no ledger entries yet.
        const entries = res.body.data || res.body;
        const tenant1Entries = entries.filter((e: any) => e.tenant_id === tenants[0].id);

        expect(tenant1Entries.length).toBe(0);
    });

    it('should block explicit attempts to access another tenant data via ID', async () => {
        // Create an object in Tenant 1
        const batch1 = await prisma.ingestionBatch.create({
            data: {
                tenant_id: tenants[0].id,
                source_type: 'CSV',
                file_name: 't1.csv'
            }
        });

        // Tenant 2 tries to GET the specific batch of Tenant 1
        const res = await request(app)
            .get(`/api/ingestion/batches/${batch1.id}`)
            .set('Authorization', `Bearer ${tokens[1]}`);

        // Scoping middleware should either return 404 or 403 or empty data
        expect([403, 404]).toContain(res.status);
    });
});
