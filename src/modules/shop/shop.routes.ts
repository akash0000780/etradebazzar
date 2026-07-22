import { Router } from "express";
import { shopController } from "./shop.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, requirePlatformAdmin } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import {
  createShopSchema,
  updateShopSchema,
  shopParamSchema,
  setAutoAssignSchema,
} from "./shop.schema";
import { memberParamSchema, setShopAccessSchema } from "./shop-access.schema";
import { shopAccessController } from "./shop-access.controller";

const router = Router();

// Platform Admin - list all shops
router.get(
  "/all",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  shopController.listAllShops,
);

// seller (tenant)
router.post(
  "/",
  protect,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(createShopSchema),
  shopController.createShop,
);

router.get(
  "/",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager", "staff"),
  shopController.listShops,
);

router.get(
  "/:shopId",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager", "staff"),
  validate(shopParamSchema),
  shopController.getShop,
);

router.patch(
  "/:shopId",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(updateShopSchema),
  shopController.updateShop,
);

router.put(
  "/access/:memberId",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(setShopAccessSchema), shopAccessController.setShopAccess
);

router.get(
  "/access/:memberId",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(memberParamSchema), shopAccessController.getMemberShopAccess
);

router.patch(
  "/:shopId/auto-assign",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner"),
  validate(setAutoAssignSchema),
  shopController.setAutoAssign
);

export default router;
