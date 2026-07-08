import { Router } from "express";
import { gstController } from "./gst.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { verifyGstSchema } from "./gst.schema";

const router = Router();

router.post("/verify", protect, sellerLimiter, validate(verifyGstSchema), gstController.verifyGst);
router.post("/verify-autofill", protect, sellerLimiter, resolveTenant, requireSellerRole("owner"),
    validate(verifyGstSchema), gstController.verifyAndAutofill);

export default router;