import { Router } from "express";
import { printAreaController } from "./print-area.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { publicLimiter, sellerLimiter } from "../../middleware/rate-limit";
import { setPrintAreaSchema, productParamSchema } from "./print-area.schema";

const router = Router();

router.get("/:productId", publicLimiter, validate(productParamSchema), printAreaController.getPrintArea);

router.put("/:productId", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    validate(setPrintAreaSchema), printAreaController.setPrintArea);
router.delete("/:productId", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    validate(productParamSchema), printAreaController.deletePrintArea);

export default router;