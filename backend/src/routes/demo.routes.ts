import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenantIsolation.middleware";
import { generateDemoData } from "../services/demo.service";

const router = Router();

router.use(authenticateToken);
router.use(requireTenant);

router.post("/generate", async (req, res) => {
    try {
        const tenantId = req.headers["x-tenant-id"] as string;
        console.log(`[DEMO] Starting 10,000 algorithmic Ledger sync for Tenant ${tenantId}...`);

        const result = await generateDemoData(tenantId);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("[DEMO] Generation Failed:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
