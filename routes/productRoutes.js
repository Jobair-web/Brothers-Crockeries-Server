import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { requireAdmin } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.get("/", listProducts);
router.get("/:idOrSlug", getProduct);
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, validateObjectId(), updateProduct);
router.delete("/:id", requireAdmin, validateObjectId(), deleteProduct);
export default router;
