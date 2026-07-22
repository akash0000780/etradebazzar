import { Router } from "express";
import { userController } from "./user.controller";
import { protect } from "../../middleware/auth";
import { requirePlatformAdmin } from "../../middleware/tenant";
import { sellerLimiter } from "../../middleware/rate-limit";

const router = Router();

router.get(
  "/",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  userController.listUsers,
);

export default router;
