import { Router } from "express";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.get("/", listCategories);
router.post("/", requireAdmin, createCategory);
router.put("/:id", requireAdmin, validateObjectId(), updateCategory);
router.delete("/:id", requireAdmin, validateObjectId(), deleteCategory);
export default router;
