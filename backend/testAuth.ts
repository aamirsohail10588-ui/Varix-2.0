async function run() {
    try {
        console.log("Testing auth/login...");
        const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@varix.com", password: "admin" })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e: any) {
        console.error("Fetch Error:", e);
    }
}
run();
