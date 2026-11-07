import { Router } from "express";
import { getWishlist, addToWishlist, removeFromWishlist, mergeWishlist } from "../controllers/wishlistController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.use(requireAuth);
router.get("/", getWishlist);
router.post("/merge", mergeWishlist);
router.post("/:productId", validateObjectId("productId"), addToWishlist);
router.delete("/:productId", validateObjectId("productId"), removeFromWishlist);
export default router;
