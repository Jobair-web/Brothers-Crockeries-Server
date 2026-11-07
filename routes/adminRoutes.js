import { Router } from "express";
import { dashboardStats } from "../controllers/orderController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
router.get("/stats", requireAdmin, dashboardStats);
export default router;
