import { Router } from "express";
import { platformController } from "./platform.controller";
import { protect } from "../../middleware/auth";
import { requirePlatformAdmin } from "../../middleware/tenant";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import {
  createPlatformRoleSchema,
  updatePlatformRoleSchema,
  platformRoleParamSchema,
  createPlatformMemberSchema,
  updatePlatformMemberSchema,
  platformMemberParamSchema,
  getAuditLogsSchema,
} from "./platform.schema";

const router = Router();

// ROLES
router.get(
  "/roles",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  platformController.listRoles
);

router.post(
  "/roles",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(createPlatformRoleSchema),
  platformController.createRole
);

router.patch(
  "/roles/:roleId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(updatePlatformRoleSchema),
  platformController.updateRole
);

router.delete(
  "/roles/:roleId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(platformRoleParamSchema),
  platformController.deleteRole
);

// MEMBERS
router.get(
  "/members",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  platformController.listMembers
);

router.post(
  "/members",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(createPlatformMemberSchema),
  platformController.addMember
);

router.patch(
  "/members/:memberId/role",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(updatePlatformMemberSchema),
  platformController.updateMemberRole
);

router.delete(
  "/members/:memberId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(platformMemberParamSchema),
  platformController.removeMember
);

// AUDIT LOGS
router.get(
  "/audit-logs",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "onboarding_manager", "product_reviewer"),
  validate(getAuditLogsSchema),
  platformController.getAuditLogs
);

export default router;