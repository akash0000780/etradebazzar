import { Router } from "express";
import { shopController } from "./shop.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole, requireSellerRole } from "../../middleware/rbac";
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
  setPlatformAdmin,
  requirePlatformRole("super_admin"),
  shopController.listAllShops,
);

// platform admin
// router.get(
//     "/pending",
//     protect,
//     setPlatformAdmin,
//     requirePlatformRole("super_admin", "onboarding_manager", "product_reviewer"),
//     shopController.listPendingShops
// );

// router.patch(
//     "/:shopId/approve",
//     protect,
//     setPlatformAdmin,
//     requirePlatformRole("super_admin", "onboarding_manager"),
//     validate(reviewShopSchema),
//     shopController.approveShop
// );

// router.patch(
//     "/:shopId/reject",
//     protect,
//     setPlatformAdmin,
//     requirePlatformRole("super_admin", "onboarding_manager"),
//     validate(rejectShopSchema),
//     shopController.rejectShop
// );

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
