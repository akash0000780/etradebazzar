import { db } from "../../db/index";
import { redis, RedisKeys } from "../../db/redis";
import { encrypt, decrypt } from "../../utils/encryption";
import { notificationService } from "../notification/notification.service";
import {
  validateAccountNumber,
  lookupIfsc,
} from "../../lib/bank/bank.validator";
import { assignDefaultRolePermissions } from "../../lib/permission/permission.service";
import bcrypt from "bcryptjs";
import { StorageFactory } from "../../lib/storage/storage.factory";

const DEFAULT_SELLER_ROLES = ["owner", "manager", "staff"];

async function getSellerOwner(sellerId: string) {
  return db.sellerMember.findFirst({
    where: { sellerId, role: { name: "owner" } },
    select: { userId: true, user: { select: { email: true } } },
  });
}

function extractStorageKey(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return value;
  }
}

async function resolveKycDocumentUrls(kyc: { documents: string[] } | null) {
  if (!kyc || !kyc.documents?.length) return kyc;
  const storage = StorageFactory.get();
  const signedDocuments = await Promise.all(
    kyc.documents.map((doc) =>
      storage.getSignedUrl({
        key: extractStorageKey(doc),
        expiresIn: 3600,
        responseContentDisposition: "inline",
      }),
    ),
  );
  return { ...kyc, documents: signedDocuments };
}
export const sellerService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    businessName: string;
    businessType: "INDIVIDUAL" | "COMPANY" | "PARTNERSHIP";
    address: { street: string; city: string; state: string; pincode: string };
  }) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email already registered");

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, password: hashedPassword },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      });

      const seller = await tx.seller.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          businessName: data.businessName,
          businessType: data.businessType,
          street: data.address.street,
          city: data.address.city,
          state: data.address.state,
          pincode: data.address.pincode,
          status: "PENDING",
        },
      });

      const roles = await Promise.all(
        DEFAULT_SELLER_ROLES.map((name) =>
          tx.sellerRole.create({ data: { sellerId: seller.id, name } }),
        ),
      );

      await assignDefaultRolePermissions(tx, roles);

      const ownerRole = roles.find((r) => r.name === "owner")!;

      await tx.sellerMember.create({
        data: { userId: user.id, sellerId: seller.id, roleId: ownerRole.id },
      });

      await tx.auditLog.create({
        data: {
          sellerId: seller.id,
          actorId: user.id,
          actorType: "seller",
          action: "SELLER_REGISTERED",
          entityType: "seller",
          entityId: seller.id,
        },
      });

      return { user, seller };
    });
  },

  async completeKyc(
    sellerId: string,
    data: {
      aadharNumber: string;
      panNumber: string;
      gstNumber?: string;
      businessRegNumber?: string;
      documents?: string[];
      govtIdType?: string;
      govtIdNumber?: string;
    },
  ) {
    const existing = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (existing) throw new Error("KYC already submitted");

    return db.sellerKyc.create({
      data: {
        sellerId,
        aadharNumber: encrypt(data.aadharNumber),
        panNumber: encrypt(data.panNumber),
        gstNumber: data.gstNumber,
        businessRegNumber: data.businessRegNumber,
        documents: data.documents ?? [],
        govtIdType: data.govtIdType,
        govtIdNumber: data.govtIdNumber
          ? encrypt(data.govtIdNumber)
          : undefined,
      },
    });
  },

  async verifyIfsc(ifscCode: string) {
    return lookupIfsc(ifscCode);
  },

  async addBankDetail(
    sellerId: string,
    data: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
    },
  ) {
    const existing = await db.sellerBankDetail.findUnique({
      where: { sellerId },
    });
    if (existing) throw new Error("Bank detail already added");

    const accountCheck = validateAccountNumber(data.accountNumber);
    if (!accountCheck.valid) throw new Error(accountCheck.error);

    const ifscResult = await lookupIfsc(data.ifscCode);
    if (!ifscResult.verified) throw new Error(ifscResult.message);

    return db.sellerBankDetail.create({
      data: {
        sellerId,
        accountHolderName: data.accountHolderName,
        accountNumber: encrypt(data.accountNumber),
        ifscCode: data.ifscCode,
        bankName: data.bankName || ifscResult.bankName || "",
      },
    });
  },

  async getBankDetail(sellerId: string) {
    const detail = await db.sellerBankDetail.findUnique({
      where: { sellerId },
    });
    if (!detail) return null;
    return { ...detail, accountNumber: decrypt(detail.accountNumber) };
  },

  async inviteSeller(actorId: string, email: string) {
    const existing = await db.seller.findUnique({ where: { email } });
    if (existing) throw new Error("Seller with this email already exists");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await db.sellerInvite.create({ data: { email, expiresAt } });

    await db.auditLog.create({
      data: {
        actorId,
        actorType: "platform",
        action: "SELLER_INVITED",
        entityType: "seller_invite",
        entityId: invite.id,
        metadata: { email },
      },
    });

    return invite;
  },

  async acceptInvite(
    token: string,
    data: {
      name: string;
      password: string;
      phone: string;
      businessName: string;
      businessType: "INDIVIDUAL" | "COMPANY" | "PARTNERSHIP";
      address: { street: string; city: string; state: string; pincode: string };
    },
  ) {
    const invite = await db.sellerInvite.findUnique({ where: { token } });
    if (!invite) throw new Error("Invalid invite token");
    if (invite.status !== "PENDING") throw new Error("Invite already used");
    if (invite.expiresAt < new Date()) {
      await db.sellerInvite.update({
        where: { token },
        data: { status: "EXPIRED" },
      });
      throw new Error("Invite expired");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: invite.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      });

      const seller = await tx.seller.create({
        data: {
          name: data.name,
          email: invite.email,
          phone: data.phone,
          businessName: data.businessName,
          businessType: data.businessType,
          street: data.address.street,
          city: data.address.city,
          state: data.address.state,
          pincode: data.address.pincode,
          invitedBy: invite.id,
        },
      });

      const roles = await Promise.all(
        DEFAULT_SELLER_ROLES.map((name) =>
          tx.sellerRole.create({ data: { sellerId: seller.id, name } }),
        ),
      );

      await assignDefaultRolePermissions(tx, roles);

      const ownerRole = roles.find((r) => r.name === "owner")!;
      await tx.sellerMember.create({
        data: { userId: user.id, sellerId: seller.id, roleId: ownerRole.id },
      });

      await tx.sellerInvite.update({
        where: { token },
        data: { status: "ACCEPTED", sellerId: seller.id },
      });

      await tx.auditLog.create({
        data: {
          sellerId: seller.id,
          actorId: user.id,
          actorType: "seller",
          action: "INVITE_ACCEPTED",
          entityType: "seller",
          entityId: seller.id,
        },
      });

      return { user, seller };
    });
  },

  async approveSeller(sellerId: string, actorId: string) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error("Seller not found");
    if (seller.status !== "PENDING") throw new Error("Seller is not pending");

    const [updated, owner] = await Promise.all([
      db.seller.update({
        where: { id: sellerId },
        data: { status: "APPROVED" },
      }),
      getSellerOwner(sellerId),
    ]);

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "platform",
        action: "SELLER_APPROVED",
        entityType: "seller",
        entityId: sellerId,
      },
    });

    await redis.del(RedisKeys.sellerStatus(sellerId));

    // Fire-and-forget  don't let notification failure break the response
    if (owner) {
      notificationService
        .sellerApproved({
          userId: owner.userId,
          email: seller.email,
          sellerName: seller.name,
          businessName: seller.businessName,
        })
        .catch(() => null);
    }

    return updated;
  },

  async rejectSeller(sellerId: string, actorId: string, reason: string) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error("Seller not found");
    if (seller.status !== "PENDING") throw new Error("Seller is not pending");

    const [updated, owner] = await Promise.all([
      db.seller.update({
        where: { id: sellerId },
        data: { status: "REJECTED" },
      }),
      getSellerOwner(sellerId),
    ]);

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "platform",
        action: "SELLER_REJECTED",
        entityType: "seller",
        entityId: sellerId,
        metadata: { reason },
      },
    });

    await redis.del(RedisKeys.sellerStatus(sellerId));

    if (owner) {
      notificationService
        .sellerRejected({
          userId: owner.userId,
          email: seller.email,
          sellerName: seller.name,
          businessName: seller.businessName,
          reason,
        })
        .catch(() => null);
    }

    return updated;
  },

  async suspendSeller(sellerId: string, actorId: string, reason: string) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error("Seller not found");
    if (seller.status === "SUSPENDED")
      throw new Error("Seller already suspended");

    const updated = await db.seller.update({
      where: { id: sellerId },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspendedBy: actorId,
      },
    });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "platform",
        action: "SELLER_SUSPENDED",
        entityType: "seller",
        entityId: sellerId,
        metadata: { reason },
      },
    });

    await redis.del(RedisKeys.sellerStatus(sellerId));

    return updated;
  },

  async reactivateSeller(sellerId: string, actorId: string) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error("Seller not found");
    if (seller.status !== "SUSPENDED")
      throw new Error("Seller is not suspended");

    const updated = await db.seller.update({
      where: { id: sellerId },
      data: {
        status: "APPROVED",
        suspendedAt: null,
        suspendedBy: null,
      },
    });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "platform",
        action: "SELLER_REACTIVATED",
        entityType: "seller",
        entityId: sellerId,
      },
    });

    await redis.del(RedisKeys.sellerStatus(sellerId));

    return updated;
  },

  async listMembers(
    sellerId: string,
    filters: { search?: string; role?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = { sellerId };
    if (filters.role) where.role = { name: filters.role };
    if (filters.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      db.sellerMember.findMany({
        where,
        select: {
          id: true,
          isActive: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sellerMember.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async addMember(
    sellerId: string,
    actorId: string,
    data: { email: string; roleId: string },
  ) {
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error("User not found");

    const role = await db.sellerRole.findFirst({
      where: { id: data.roleId, sellerId },
    });
    if (!role) throw new Error("Role not found");

    const existing = await db.sellerMember.findUnique({
      where: { userId_sellerId: { userId: user.id, sellerId } },
    });
    if (existing) throw new Error("User already a member");

    const member = await db.sellerMember.create({
      data: { userId: user.id, sellerId, roleId: data.roleId },
    });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "MEMBER_ADDED",
        entityType: "seller_member",
        entityId: member.id,
        metadata: { email: data.email, roleId: data.roleId },
      },
    });

    return member;
  },

  async updateMemberRole(
    sellerId: string,
    actorId: string,
    memberId: string,
    roleId: string,
  ) {
    const member = await db.sellerMember.findFirst({
      where: { id: memberId, sellerId },
    });
    if (!member) throw new Error("Member not found");

    const role = await db.sellerRole.findFirst({
      where: { id: roleId, sellerId },
    });
    if (!role) throw new Error("Role not found");

    const updated = await db.sellerMember.update({
      where: { id: memberId },
      data: { roleId },
    });

    await redis.del(RedisKeys.userRoles(member.userId, sellerId));
    await redis.del(RedisKeys.userPermissions(member.userId, sellerId));

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "MEMBER_ROLE_UPDATED",
        entityType: "seller_member",
        entityId: memberId,
        metadata: { roleId },
      },
    });

    return updated;
  },

  async listPendingSellers() {
    return db.seller.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessType: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async listAllSellers(status?: string) {
    const where = status
      ? {
        status: status.toUpperCase() as
          | "PENDING"
          | "APPROVED"
          | "REJECTED"
          | "SUSPENDED",
      }
      : {};
    return db.seller.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessType: true,
        status: true,
        createdAt: true,
        kyc: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getSellerById(sellerId: string) {
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessType: true,
        street: true,
        city: true,
        state: true,
        pincode: true,
        status: true,
        createdAt: true,
        kyc: {
          select: {
            id: true,
            status: true,
            gstNumber: true,
            businessRegNumber: true,
            documents: true,
            govtIdType: true,
            aadhaarStatus: true,
            govtIdStatus: true,
            rejectedReason: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!seller) return null;

    return { ...seller, kyc: await resolveKycDocumentUrls(seller.kyc) };
  },
  async verifyKyc(sellerId: string, actorId: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC not found");
    if (kyc.status === "VERIFIED") throw new Error("KYC already verified");

    const [updated, owner, seller] = await Promise.all([
      db.$transaction(async (tx) => {
        const result = await tx.sellerKyc.update({
          where: { sellerId },
          data: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: actorId,
          },
        });
        await tx.auditLog.create({
          data: {
            sellerId,
            actorId,
            actorType: "platform",
            action: "KYC_VERIFIED",
            entityType: "seller_kyc",
            entityId: kyc.id,
          },
        });
        return result;
      }),
      getSellerOwner(sellerId),
      db.seller.findUnique({
        where: { id: sellerId },
        select: { email: true, name: true },
      }),
    ]);

    if (owner && seller) {
      notificationService
        .notify({
          userId: owner.userId,
          email: seller.email,
          type: "KYC_VERIFIED",
          title: "KYC verified",
          message: "Your KYC has been verified successfully.",
          channels: ["email", "sse"],
        })
        .catch(() => null);
    }

    return updated;
  },

  async rejectKyc(sellerId: string, actorId: string, reason: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC not found");
    if (kyc.status === "VERIFIED")
      throw new Error("Cannot reject verified KYC");

    const [updated, owner, seller] = await Promise.all([
      db.$transaction(async (tx) => {
        const result = await tx.sellerKyc.update({
          where: { sellerId },
          data: { status: "REJECTED", rejectedReason: reason },
        });
        await tx.auditLog.create({
          data: {
            sellerId,
            actorId,
            actorType: "platform",
            action: "KYC_REJECTED",
            entityType: "seller_kyc",
            entityId: kyc.id,
            metadata: { reason },
          },
        });
        return result;
      }),
      getSellerOwner(sellerId),
      db.seller.findUnique({
        where: { id: sellerId },
        select: { email: true, name: true },
      }),
    ]);

    if (owner && seller) {
      notificationService
        .notify({
          userId: owner.userId,
          email: seller.email,
          type: "KYC_REJECTED",
          title: "KYC rejected",
          message: `Your KYC was rejected. Reason: ${reason}`,
          channels: ["email", "sse"],
        })
        .catch(() => null);
    }

    return updated;
  },

  async listPendingKyc() {
    return db.sellerKyc.findMany({
      select: {
        id: true,
        status: true,
        gstNumber: true,
        businessRegNumber: true,
        govtIdType: true,
        aadhaarStatus: true,
        govtIdStatus: true,
        rejectedReason: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            businessName: true,
            businessType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async inviteMember(
    sellerId: string,
    actorId: string,
    data: { email: string; roleId: string; name?: string },
  ) {
    const role = await db.sellerRole.findFirst({
      where: { id: data.roleId, sellerId },
    });
    if (!role) throw new Error("Role not found");

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      const existingMember = await db.sellerMember.findUnique({
        where: { userId_sellerId: { userId: existingUser.id, sellerId } },
      });
      if (existingMember) throw new Error("User already a member");
    }

    const existingInvite = await db.teamInvite.findFirst({
      where: { sellerId, email: data.email, status: "PENDING" },
    });
    if (existingInvite)
      throw new Error("Invite already pending for this email");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await db.teamInvite.create({
      data: {
        sellerId,
        email: data.email,
        roleId: data.roleId,
        invitedBy: actorId,
        expiresAt,
      },
    });

    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: { businessName: true },
    });

    notificationService
      .notify({
        userId: existingUser?.id ?? "",
        email: data.email,
        type: "TEAM_INVITE" as any,
        title: "You've been invited to join a team",
        message: `You've been invited to join ${seller?.businessName ?? "a seller"} on ETradeBazaar as ${role.name}.`,
        channels: ["email"],
        data: { token: invite.token },
      })
      .catch(() => null);

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "MEMBER_INVITED",
        entityType: "team_invite",
        entityId: invite.id,
        metadata: { email: data.email, roleId: data.roleId },
      },
    });

    return invite;
  },

  async removeMember(sellerId: string, actorId: string, memberId: string) {
    const member = await db.sellerMember.findFirst({
      where: { id: memberId, sellerId },
      include: { role: true },
    });
    if (!member) throw new Error("Member not found");
    if (member.role.name === "owner")
      throw new Error("Cannot remove the owner");

    await db.sellerMember.delete({ where: { id: memberId } });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "MEMBER_REMOVED",
        entityType: "seller_member",
        entityId: memberId,
      },
    });

    return { removed: true };
  },

  async listRoles(sellerId: string) {
    return db.sellerRole.findMany({
      where: { sellerId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async createRole(
    sellerId: string,
    actorId: string,
    data: { name: string; description?: string },
  ) {
    const existing = await db.sellerRole.findUnique({
      where: { sellerId_name: { sellerId, name: data.name } },
    });
    if (existing) throw new Error("Role with this name already exists");

    const role = await db.sellerRole.create({
      data: { sellerId, name: data.name, description: data.description },
    });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "ROLE_CREATED",
        entityType: "seller_role",
        entityId: role.id,
      },
    });

    return role;
  },

  async updateRole(
    sellerId: string,
    actorId: string,
    roleId: string,
    data: { name?: string; description?: string },
  ) {
    const role = await db.sellerRole.findFirst({
      where: { id: roleId, sellerId },
    });
    if (!role) throw new Error("Role not found");
    if (["owner", "manager", "staff"].includes(role.name))
      throw new Error("Cannot modify default roles");

    const updated = await db.sellerRole.update({ where: { id: roleId }, data });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "ROLE_UPDATED",
        entityType: "seller_role",
        entityId: roleId,
      },
    });

    return updated;
  },

  async deleteRole(sellerId: string, actorId: string, roleId: string) {
    const role = await db.sellerRole.findFirst({
      where: { id: roleId, sellerId },
      include: { _count: { select: { members: true } } },
    });
    if (!role) throw new Error("Role not found");
    if (["owner", "manager", "staff"].includes(role.name))
      throw new Error("Cannot delete default roles");
    if (role._count.members > 0)
      throw new Error("Cannot delete role with active members");

    await db.sellerRole.delete({ where: { id: roleId } });

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "ROLE_DELETED",
        entityType: "seller_role",
        entityId: roleId,
      },
    });

    return { deleted: true };
  },

  async listInvites(sellerId: string) {
    return db.teamInvite.findMany({
      where: { sellerId, status: "PENDING" },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async revokeInvite(sellerId: string, inviteId: string) {
    const invite = await db.teamInvite.findFirst({
      where: { id: inviteId, sellerId },
    });
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "PENDING")
      throw new Error("Invite already used or expired");

    return db.teamInvite.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });
  },

  async resendInvite(sellerId: string, inviteId: string) {
    const invite = await db.teamInvite.findFirst({
      where: { id: inviteId, sellerId },
      select: {
        id: true,
        email: true,
        status: true,
        token: true,
        role: { select: { id: true, name: true } },
      },
    });
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "PENDING")
      throw new Error("Invite already used or expired");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await db.teamInvite.update({
      where: { id: inviteId },
      data: { expiresAt },
    });

    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: { businessName: true },
    });
    notificationService
      .notify({
        userId: "",
        email: invite.email,
        type: "TEAM_INVITE" as any,
        title: "Reminder: You've been invited to join a team",
        message: `Reminder — you've been invited to join ${seller?.businessName ?? "a seller"} as ${(invite as any).role?.name ?? "a member"}.`,
        channels: ["email"],
        data: { token: invite.token },
      })
      .catch(() => null);

    return updated;
  },

  async acceptTeamInvite(
    token: string,
    data: { name: string; password: string },
  ) {
    const invite = await db.teamInvite.findUnique({ where: { token } });
    if (!invite) throw new Error("Invalid invite token");
    if (invite.status !== "PENDING")
      throw new Error("Invite already used or revoked");
    if (invite.expiresAt < new Date()) throw new Error("Invite expired");

    let user = await db.user.findUnique({ where: { email: invite.email } });

    return db.$transaction(async (tx) => {
      if (!user) {
        const hashedPassword = await bcrypt.hash(data.password, 12);
        user = await tx.user.create({
          data: {
            name: data.name,
            email: invite.email,
            password: hashedPassword,
          },
        });
      }

      const member = await tx.sellerMember.create({
        data: {
          userId: user.id,
          sellerId: invite.sellerId,
          roleId: invite.roleId,
        },
      });

      await tx.teamInvite.update({
        where: { token },
        data: { status: "ACCEPTED" },
      });

      return { user, member };
    });
  },

  async listRolePermissions(sellerId: string, roleId: string) {
    const role = await db.sellerRole.findFirst({
      where: { id: roleId, sellerId },
      select: {
        id: true,
        name: true,
        permissions: {
          select: { permission: { select: { id: true, key: true } } },
        },
      },
    });
    if (!role) throw new Error("Role not found");
    return role;
  },

  async updateRolePermissions(
    sellerId: string,
    actorId: string,
    roleId: string,
    permissionKeys: string[],
  ) {
    const role = await db.sellerRole.findFirst({
      where: { id: roleId, sellerId },
    });
    if (!role) throw new Error("Role not found");
    if (role.name === "owner")
      throw new Error("Cannot modify owner role permissions");

    const permissions = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    });

    const foundKeys = new Set(permissions.map((p) => p.key));
    const missing = permissionKeys.filter((k) => !foundKeys.has(k));
    if (missing.length > 0)
      throw new Error(`Unknown permissions: ${missing.join(", ")}`);

    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        });
      }

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "ROLE_PERMISSIONS_UPDATED",
          entityType: "seller_role",
          entityId: roleId,
          metadata: { permissions: permissionKeys },
        },
      });
    });

    const members = await db.sellerMember.findMany({
      where: { roleId, isActive: true },
      select: { userId: true },
    });

    for (const member of members) {
      await redis.del(RedisKeys.userPermissions(member.userId, sellerId));
    }

    return { roleId, permissions: permissionKeys };
  },

  async listAllPermissions() {
    return db.permission.findMany({
      select: { id: true, key: true, description: true },
      orderBy: { key: "asc" },
    });
  },
};
