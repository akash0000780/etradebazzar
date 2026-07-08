import { Router } from "express";
import { platformController } from "./platform.controller";
import { protect } from "../../middleware/auth";
import { setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import {
  createPlatformRoleSchema,
  updatePlatformRoleSchema,
  platformRoleParamSchema,
  createPlatformMemberSchema,
  updatePlatformMemberSchema,
  platformMemberParamSchema,
} from "./platform.schema";

const router = Router();

const platformGuard = [protect,
sellerLimiter, setPlatformAdmin];

// ROLES
router.get(
  "/roles",
  ...platformGuard,
  requirePlatformRole("super_admin"),
  platformController.listRoles
);

router.post(
  "/roles",
  ...platformGuard,
  requirePlatformRole("super_admin"),
  validate(createPlatformRoleSchema), 
  platformController.createRole
);

router.patch(
  "/roles/:roleId", 
  ...platformGuard, 
  requirePlatformRole("super_admin"), 
  validate(updatePlatformRoleSchema), 
  platformController.updateRole
);

router.delete(
  "/roles/:roleId", 
  ...platformGuard, 
  requirePlatformRole("super_admin"), 
  validate(platformRoleParamSchema), 
  platformController.deleteRole
);

// MEMBERS
router.get(
  "/members", 
  ...platformGuard, 
  requirePlatformRole("super_admin"), 
  platformController.listMembers
);

router.post(
  "/members", 
  ...platformGuard, 
  requirePlatformRole("super_admin"), 
  validate(createPlatformMemberSchema), 
  platformController.addMember
);

router.patch(
  "/members/:memberId/role",
   ...platformGuard, 
   requirePlatformRole("super_admin"),
   validate(updatePlatformMemberSchema), 
   platformController.updateMemberRole
  );

router.delete(
  "/members/:memberId", 
  ...platformGuard, 
  requirePlatformRole("super_admin"), 
  validate(platformMemberParamSchema), 
  platformController.removeMember
);

// AUDIT LOGS
router.get(
  "/audit-logs", 
  ...platformGuard,
   requirePlatformRole("super_admin", "onboarding_manager", "product_reviewer"),
    platformController.getAuditLogs
  );

export default router;