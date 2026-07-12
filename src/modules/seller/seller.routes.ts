import { Router } from "express";
import { sellerController } from "./seller.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole } from "../../middleware/rbac";
import { requirePermission } from "../../middleware/permission";
import { PERMISSIONS } from "../../lib/permission/permission.constants";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
  registerSellerSchema,
  completeSellerKycSchema,
  addBankDetailSchema,
  inviteSellerSchema,
  acceptInviteSchema,
  approveSellerSchema,
  rejectSellerSchema,
  suspendSellerSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  kycActionSchema,
  rejectKycSchema,
  verifyIfscSchema,
  inviteMemberSchema,
  removeMemberSchema,
  createRoleSchema,
  updateRoleSchema,
  roleParamSchema,
  inviteParamSchema,
  resendInviteSchema,
  acceptTeamInviteSchema,
} from "./seller.schema";

const router = Router();

//Public
router.post(
  "/register",
  publicLimiter,
  validate(registerSellerSchema),
  sellerController.register,
);
router.post(
  "/invite/accept",
  publicLimiter,
  validate(acceptInviteSchema),
  sellerController.acceptInvite,
);

//Platform admin
router.post(
  "/invite",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  validate(inviteSellerSchema),
  sellerController.inviteSeller,
);

router.get(
  "/pending",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerController.listPendingSellers,
);

router.get(
  "/all",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerController.listAllSellers,
);

router.get(
  "/kyc/pending",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerController.listPendingKyc,
);

// Seller
router.post(
  "/kyc",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_KYC),
  validate(completeSellerKycSchema),
  sellerController.completeKyc,
);

router.post(
  "/bank",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_BANK),
  validate(addBankDetailSchema),
  sellerController.addBankDetail,
);

router.get(
  "/bank",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_BANK),
  sellerController.getBankDetail,
);

router.post(
  "/bank/verify-ifsc",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_BANK),
  validate(verifyIfscSchema),
  sellerController.verifyIfsc,
);

// Team management (must be before /:sellerId to avoid route shadowing)
router.get(
  "/members",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_MEMBERS_VIEW),
  sellerController.listMembers,
);

router.post(
  "/members",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_MEMBERS_MANAGE),
  validate(addMemberSchema),
  sellerController.addMember,
);

router.patch(
  "/members/:memberId/role",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_MEMBERS_MANAGE),
  validate(updateMemberRoleSchema),
  sellerController.updateMemberRole,
);

router.post(
  "/members/invite",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_MEMBERS_MANAGE),
  validate(inviteMemberSchema),
  sellerController.inviteMember,
);

router.delete(
  "/members/:memberId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_MEMBERS_MANAGE),
  validate(removeMemberSchema),
  sellerController.removeMember,
);

router.get(
  "/roles",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  sellerController.listRoles,
);

router.post(
  "/roles",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  validate(createRoleSchema),
  sellerController.createRole,
);

router.patch(
  "/roles/:roleId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  validate(updateRoleSchema),
  sellerController.updateRole,
);

router.delete(
  "/roles/:roleId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  validate(roleParamSchema),
  sellerController.deleteRole,
);

router.get(
  "/roles/:roleId/permissions",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  validate(roleParamSchema),
  sellerController.listRolePermissions,
);

router.put(
  "/roles/:roleId/permissions",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  validate(roleParamSchema),
  sellerController.updateRolePermissions,
);

router.get(
  "/permissions",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_ROLES_MANAGE),
  sellerController.listAllPermissions,
);

router.get(
  "/invites",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_INVITES_MANAGE),
  sellerController.listInvites,
);

router.delete(
  "/invites/:inviteId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_INVITES_MANAGE),
  validate(inviteParamSchema),
  sellerController.revokeInvite,
);

router.post(
  "/invites/resend",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.SELLER_INVITES_MANAGE),
  validate(resendInviteSchema),
  sellerController.resendInvite,
);

// Platform -Dynamic
router.get(
  "/:sellerId",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager", "product_reviewer"),
  validate(approveSellerSchema),
  sellerController.getSellerById,
);

router.patch(
  "/:sellerId/approve",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  validate(approveSellerSchema),
  sellerController.approveSeller,
);

router.patch(
  "/:sellerId/reject",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  validate(rejectSellerSchema),
  sellerController.rejectSeller,
);

router.patch(
  "/:sellerId/suspend",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin"),
  validate(suspendSellerSchema),
  sellerController.suspendSeller,
);

router.patch(
  "/:sellerId/reactivate",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin"),
  sellerController.reactivateSeller,
);

router.patch(
  "/:sellerId/kyc/verify",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  validate(kycActionSchema),
  sellerController.verifyKyc,
);

router.patch(
  "/:sellerId/kyc/reject",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin", "onboarding_manager"),
  validate(rejectKycSchema),
  sellerController.rejectKyc,
);

// Public — no auth (invitee doesn't have account yet)
router.post(
  "/invites/accept",
  validate(acceptTeamInviteSchema),
  sellerController.acceptTeamInvite,
);
export default router;
