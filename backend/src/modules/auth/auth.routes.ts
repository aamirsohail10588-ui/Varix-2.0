import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import { authController } from "./auth.controller";

const router = Router();

router.get("/me", authenticateToken, authController.getCurrentUser);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/mfa/setup", authController.setupMfa);
router.post("/mfa/verify", authController.verifyMfa);
router.post("/api-keys", authController.createApiKey);
router.post("/service-accounts", authController.createServiceAccount);

export default router;