import { Router } from "express";
import { userController } from "./user.controller";
import { protect } from "../../middleware/auth";
import { setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole } from "../../middleware/rbac";
import { sellerLimiter } from "../../middleware/rate-limit";

const router = Router();

router.get(
  "/",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin"),
  userController.listUsers,
);

export default router;
