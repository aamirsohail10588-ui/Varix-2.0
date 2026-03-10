const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Generate Mock Financial ERP CSV Export
const csvData = `Account,Debit Amount,Credit Amount,Currency,Transaction Date,invoice_number,voucher_number
CASH,15000,0,USD,2026-03-01,INV-100,1001
SALES,0,15000,USD,2026-03-01,,1001
RENT,5000,0,USD,2026-03-02,INV-200,1002
BANK,0,5000,USD,2026-03-02,,1002`;

fs.writeFileSync('test_ingest.csv', csvData);

async function runTest() {
    try {
        console.log("1. Authenticating...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@varix.com',
            password: 'admin'
        });

        const token = loginRes.data.accessToken;
        const activeTenantId = loginRes.data.user.tenants[0].tenantId;

        console.log(`2. Using Tenant ID: ${activeTenantId}`);

        console.log("3. Uploading ledger flatfile...");
        const formData = new FormData();
        formData.append('file', fs.createReadStream('test_ingest.csv'));

        const uploadRes = await axios.post('http://localhost:5000/api/ingestion/upload', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': activeTenantId,
                ...formData.getHeaders()
            }
        });

        console.log("Upload Success:", uploadRes.data);

        // Wait 2 seconds for processing (Since BullMQ or sync pipeline)
        setTimeout(async () => {
            console.log("4. Fetching Normalized Canonical Ledger...");
            const ledgerRes = await axios.get('http://localhost:5000/api/ledger/summary', {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': activeTenantId }
            });
            console.log("Ledger Summary:", ledgerRes.data);
        }, 2000);

    } catch (err) {
        console.error("Test Failed:", err.response ? err.response.data : err.message);
    }
}

runTest();
