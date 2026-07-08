import { Router } from "express";
import { sellerProfileController } from "./seller-profile.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { updateProfileSchema, updateBusinessSchema, shopStatsParamSchema } from "./seller-profile.schema";

const router = Router();
const guard = [protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager")];

router.get("/profile", ...guard, sellerProfileController.getProfile);
router.put("/profile", ...guard, validate(updateProfileSchema), sellerProfileController.updateProfile);
router.get("/business", ...guard, sellerProfileController.getBusiness);
router.put("/business", ...guard, validate(updateBusinessSchema), sellerProfileController.updateBusiness);
router.get("/verification-badges", ...guard, sellerProfileController.getVerificationBadges);
router.get("/shops/:shopId/stats", ...guard, validate(shopStatsParamSchema), sellerProfileController.getShopStats);

export default router;