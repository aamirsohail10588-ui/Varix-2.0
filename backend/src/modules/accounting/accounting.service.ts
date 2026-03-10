import prisma from "../../infrastructure/prisma";

export class AccountingService {
    async normalizeBatch(tenantId: string, batchId: string, snapshotId: string) {
        const batchSize = 5000;
        let offset = 0;

        let rawRecords = [];

        while (true) {
            const batch = await prisma.rawRecord.findMany({
                where: { batch_id: batchId, snapshotId: snapshotId },
                skip: offset,
                take: batchSize
            });

            if (batch.length === 0) break;

            rawRecords.push(...batch);
            offset += batchSize;
        }

        if (rawRecords.length === 0) return;

        const accounts = await prisma.account.findMany({ where: { tenantId } });
        const accountMap = new Map(accounts.map((a: any) => [a.code, a.id]));

        let totalDebits = 0;
        let totalCredits = 0;
        const ledgerEntries = [];

        for (const record of rawRecords) {
            const payload = record.payload_json as any;
            const accountCode = payload.account_code || payload.Account || payload['Account Code'];
            const debitRaw = payload.debit_amount || payload.Debit || payload['Debit Amount'] || 0;
            const creditRaw = payload.credit_amount || payload.Credit || payload['Credit Amount'] || 0;
            const currency = payload.currency || payload.Currency || "USD";
            const dateRaw = payload.transaction_date || payload.Date || payload['Transaction Date'] || new Date();

            if (!currency || !dateRaw || !accountCode) continue;

            const debitAmount = parseFloat(debitRaw.toString()) || 0;
            const creditAmount = parseFloat(creditRaw.toString()) || 0;

            totalDebits += debitAmount;
            totalCredits += creditAmount;

            let accountId = accountMap.get(accountCode);
            if (!accountId) {
                const newAcc = await prisma.account.create({
                    data: { tenantId, code: accountCode, name: `Auto-generated ${accountCode}`, type: "ASSET" }
                });
                accountId = newAcc.id;
                accountMap.set(accountCode, accountId);
            }

            const transactionId =
                payload.transaction_id ||
                payload.ID ||
                payload.voucher_number ||
                null;

            const amount = debitAmount > 0 ? debitAmount : creditAmount;

            if (amount === 0) {
                continue;
            }

            // primary account entry
            ledgerEntries.push({
                tenant_id: tenantId,
                transaction_date: new Date(dateRaw),
                account_id: accountId,
                debit_amount: debitAmount > 0 ? amount : 0,
                credit_amount: creditAmount > 0 ? amount : 0,
                currency: currency,
                source_system: "VARIX_PIPELINE",
                snapshot_id: snapshotId,
                raw_record_id: record.id,
                ingestion_batch_id: batchId,
                source_id: transactionId,
                confidence_score: 100
            });

            // balancing account entry
            let suspenseAccount = accountMap.get("9999");

            if (!suspenseAccount) {
                const acc = await prisma.account.upsert({
                    where: { tenantId_code: { tenantId, code: "9999" } },
                    update: {},
                    create: {
                        tenantId,
                        code: "9999",
                        name: "Suspense Clearing",
                        type: "ASSET"
                    }
                });

                suspenseAccount = acc.id;
                accountMap.set("9999", suspenseAccount);
            }

            ledgerEntries.push({
                tenant_id: tenantId,
                transaction_date: new Date(dateRaw),
                account_id: suspenseAccount,
                debit_amount: creditAmount > 0 ? amount : 0,
                credit_amount: debitAmount > 0 ? amount : 0,
                currency: currency,
                source_system: "VARIX_PIPELINE",
                snapshot_id: snapshotId,
                raw_record_id: record.id,
                ingestion_batch_id: batchId,
                source_id: transactionId,
                confidence_score: 100
            });
        }

        const balanceDiff = Math.abs(totalDebits - totalCredits);
        if (balanceDiff > 0.01) {
            throw new Error(`Normalization failed: imbalanced snapshot (${totalDebits.toFixed(2)} vs ${totalCredits.toFixed(2)})`);
        }

        if (ledgerEntries.length > 0) {
            const chunkSize = 5000;

            for (let i = 0; i < ledgerEntries.length; i += chunkSize) {
                const chunk = ledgerEntries.slice(i, i + chunkSize);

                await prisma.ledgerEntry.createMany({
                    data: chunk,
                    skipDuplicates: true
                });
            }
        }
    }

    async getLedgerEntries(tenantId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const entries = await prisma.ledgerEntry.findMany({
            where: { tenant_id: tenantId },
            include: { account: true },
            orderBy: { transaction_date: 'desc' },
            skip,
            take: limit
        });

        const count = await prisma.ledgerEntry.count({ where: { tenant_id: tenantId } });
        return { data: entries, meta: { total: count, page, limit } };
    }

    async getLedgerSummary(tenantId: string, period?: string) {

        const where: any = { tenant_id: tenantId };

        if (period) {
            where.posting_period = period;
        }

        const summary = await prisma.ledgerEntry.aggregate({
            where,
            _sum: { debit_amount: true, credit_amount: true },
            _count: { id: true }
        });

        return {
            totalRows: summary._count.id,
            totalDebits: Number(summary._sum.debit_amount || 0),
            totalCredits: Number(summary._sum.credit_amount || 0),
            isBalanced: Math.abs(Number(summary._sum.debit_amount || 0) - Number(summary._sum.credit_amount || 0)) < 0.01
        };
    }
}

export const accountingService = new AccountingService();
