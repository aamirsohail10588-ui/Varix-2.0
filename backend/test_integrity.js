const axios = require('axios');

async function testIntegrity() {
    try {
        console.log("1. Authenticating Admin...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@varix.com',
            password: 'admin'
        });

        const token = loginRes.data.accessToken;
        const tenantId = loginRes.data.user.tenants[0].tenantId;

        console.log("2. Fetching Mapped Normalized Integrity Score...");
        const res = await axios.get('http://localhost:5000/api/metrics/integrity-score', {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenantId
            }
        });

        console.log("Integrity Metrics Received:", res.data);
        process.exit(0);
    } catch (err) {
        console.error("Test Failed:", err.message);
        process.exit(1);
    }
}

testIntegrity();
