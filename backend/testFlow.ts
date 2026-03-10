

async function run() {
    try {
        console.log("1. Logging in...");
        const logRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@varix.com", password: "admin" })
        });
        const authData = await logRes.json();

        if (!authData.token) {
            console.error("Login failed!", authData);
            return;
        }

        const tenantId = authData.user.tenants[0].tenantId;
        const period = "2026-Q1";

        console.log(`2. Fetching dashboard for tenant ${tenantId}...`);
        const dashRes = await fetch(`http://localhost:5000/api/dashboard/metrics?period=${period}`, {
            headers: {
                "Authorization": `Bearer ${authData.token}`,
                "x-tenant-id": tenantId
            }
        });

        const dashData = await dashRes.json();
        console.log("Dashboard Status:", dashRes.status);
        if (dashRes.status !== 200) {
            console.error("Dashboard Error Payload:", dashData);
        } else {
            console.log("Dashboard Success! Keys:", Object.keys(dashData));
        }
    } catch (e) {
        console.error("Fetch Exception:", e);
    }
}
run();
