import axios from "axios";

async function testStatus() {
    try {
        console.log("Authenticating Demo Corp natively...");
        const regRes = await axios.post("http://localhost:5000/api/auth/login", {
            email: "admin@varix.com", password: "admin"
        }).catch(async () => {
            return await axios.post("http://localhost:5000/api/auth/register", {
                email: "admin@varix.com", password: "admin", name: "Admin", tenantName: "Demo Corp"
            });
        });

        const token = regRes.data.token;
        const activeTenantId = regRes.data.user.tenants[0].tenantId;

        console.log(`Hitting /api/connectors/status dynamically mapped...`);
        const res = await axios.get("http://localhost:5000/api/connectors/status", {
            headers: {
                Authorization: `Bearer ${token}`,
                "x-tenant-id": activeTenantId
            }
        });

        console.log("SUCCESS! Connectors API responded:", res.data);
    } catch (e: any) {
        console.error("FAILED dynamically:", e.response?.data || e.message);
    }
}

testStatus();
