import { Router } from "express";
import { uploadImages } from "../controllers/uploadController.js";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.post("/", requireAdmin, upload.array("images", 8), uploadImages);
export default router;
