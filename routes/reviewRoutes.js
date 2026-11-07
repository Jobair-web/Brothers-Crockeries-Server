import { Router } from "express";
import { listReviews, listAllReviews, createReview, setReviewApproval, deleteReview } from "../controllers/reviewController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.get("/", listReviews);
router.get("/all", requireAdmin, listAllReviews);
router.post("/", requireAuth, createReview);
router.patch("/:id/approval", requireAdmin, validateObjectId(), setReviewApproval);
router.delete("/:id", requireAdmin, validateObjectId(), deleteReview);
export default router;
