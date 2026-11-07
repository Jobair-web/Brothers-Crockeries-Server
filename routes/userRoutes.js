import { Router } from "express";
import { listUsers, updateUserRole, deleteUser } from "../controllers/userController.js";
import { requireAdmin } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.use(requireAdmin);
router.get("/", listUsers);
router.patch("/:id/role", validateObjectId(), updateUserRole);
router.delete("/:id", validateObjectId(), deleteUser);
export default router;
