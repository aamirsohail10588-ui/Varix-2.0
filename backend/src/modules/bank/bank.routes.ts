import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";
import { bankController } from "./bank.controller";

const router = Router();

router.post("/statements", authenticateToken, requireTenant, bankController.uploadStatement);
router.get("/statements", authenticateToken, requireTenant, bankController.getStatements);

export default router;
