import prisma from "./src/lib/prisma";
import { calculatePeriodRisk } from "./src/services/risk.service";

async function run() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return console.error("No tenant found");

    const d = new Date();
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    console.log(`Recalibrating Global Risk Scores explicitly for Tenant ${tenant.id} at Period ${period}...`);

    const risk = await calculatePeriodRisk(tenant.id, period);
    console.log("Risk Scores successfully updated natively: ", risk);

    process.exit(0);
}

run();
