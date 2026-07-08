import { Router } from "express";
import { securityController } from "./security.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { verifyTwoFactorSchema, sessionParamSchema } from "./security.schema";

const router = Router();

router.get("/summary", protect, sellerLimiter, securityController.getSecuritySummary);

router.post("/2fa/setup", protect, sellerLimiter, securityController.setupTwoFactor);
router.post("/2fa/verify", protect, sellerLimiter, validate(verifyTwoFactorSchema), securityController.verifyTwoFactor);
router.post("/2fa/disable", protect, sellerLimiter, validate(verifyTwoFactorSchema), securityController.disableTwoFactor);

router.get("/sessions", protect, sellerLimiter, securityController.listSessions);
router.delete("/sessions/:sessionId", protect, sellerLimiter, validate(sessionParamSchema), securityController.revokeSession);
router.post("/sessions/revoke-all", protect, sellerLimiter, securityController.revokeAllSessions);

export default router;