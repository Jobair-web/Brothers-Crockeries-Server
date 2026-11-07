import { Router } from "express";
import { createOrder, myOrders, getOrder, listOrders, updateOrderStatus, verifyPayment } from "../controllers/orderController.js";
import { optionalAuth, requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.post("/", optionalAuth, createOrder);
router.get("/mine", requireAuth, myOrders);
router.get("/", requireAdmin, listOrders);
router.get("/:idOrNumber", requireAuth, getOrder);
router.patch("/:id/status", requireAdmin, validateObjectId(), updateOrderStatus);
router.patch("/:id/payment", requireAdmin, validateObjectId(), verifyPayment);
export default router;
