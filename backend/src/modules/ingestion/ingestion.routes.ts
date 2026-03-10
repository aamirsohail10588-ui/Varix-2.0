import { Router } from "express";
import multer from "multer";
import { ingestionController } from "./ingestion.controller";
import { simulationController } from "./simulation.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB
    },
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, "uploads/");
        },
        filename: (req, file, cb) => {
            const unique = Date.now() + "-" + file.originalname;
            cb(null, unique);
        }
    })
});
const router = Router();

router.post("/upload", authenticateToken, requireTenant, upload.single("file"), ingestionController.upload);
router.get("/batch/:batchId/status", authenticateToken, requireTenant, ingestionController.getStatus);

// Simulation / Test Import
router.post("/import-test", authenticateToken, requireTenant, upload.single("file"), simulationController.importTestDataset);

// Connector Routes
router.get("/connectors/status", authenticateToken, requireTenant, ingestionController.getConnectors);
router.post("/connectors/create", authenticateToken, requireTenant, ingestionController.createConnector);
router.post("/connectors/sync", authenticateToken, requireTenant, ingestionController.syncConnector);
router.post("/connectors/zoho/auth", authenticateToken, requireTenant, ingestionController.getZohoAuth);
router.post("/connectors/zoho/callback", authenticateToken, requireTenant, ingestionController.handleZohoCallback);

export default router;