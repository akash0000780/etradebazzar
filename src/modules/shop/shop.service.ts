import { db } from "../../db";
import { generateDisplayId } from "../../lib/uid/uid.generator";

import { shopAccessService } from "./shop-access.service";
import { StorageFactory } from "../../lib/storage/storage.factory";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(name: string): Promise<string> {
  let slug = generateSlug(name);
  const existing = await db.shop.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }
  return slug;
}
export async function resolveShopMediaUrls<T extends { logo?: string | null; logoKey?: string | null; banner?: string | null; bannerKey?: string | null }>(
  shop: T,
): Promise<T> {
  const storage = StorageFactory.get();
  const result = { ...shop };
  if (shop.logoKey) {
    result.logo = await storage.getSignedUrl({ key: shop.logoKey, expiresIn: 3600 });
  }
  if (shop.bannerKey) {
    result.banner = await storage.getSignedUrl({ key: shop.bannerKey, expiresIn: 3600 });
  }
  return result;
}

export const shopService = {
  async createShop(
    sellerId: string,
    actorId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      logo?: string;
      logoKey?: string;
      bannerKey?: string;
      banner?: string;
      contactEmail: string;
      contactPhone: string;
      returnPolicy?: string;
      pickupStreet: string;
      pickupCity: string;
      pickupState: string;
      pickupPincode: string;
    },
  ) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new Error("Seller not found");
    if (seller.status !== "APPROVED") throw new Error("Seller not approved");

    const slug = await uniqueSlug(data.name);
    const displayId = await generateDisplayId("shop");

    const shop = await db.$transaction(async (tx) => {
      const newShop = await tx.shop.create({
        data: { sellerId, slug, displayId, status: "APPROVED", ...data },
      });

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "SHOP_CREATED",
          entityType: "shop",
          entityId: newShop.id,
          metadata: { name: data.name },
        },
      });

      return newShop;
    });

    return shop;
  },

  async updateShop(
    sellerId: string,
    actorId: string,
    shopId: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      logo: string;
      banner: string;
      logoKey?: string;
      bannerKey?: string;
      contactEmail: string;
      contactPhone: string;
      returnPolicy: string;
      pickupStreet: string;
      pickupCity: string;
      pickupState: string;
      pickupPincode: string;
    }>,
  ) {
    const shop = await db.shop.findFirst({ where: { id: shopId, sellerId } });
    if (!shop) throw new Error("Shop not found");
    if (shop.status === "REJECTED")
      throw new Error("Cannot update rejected shop");

    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = await uniqueSlug(data.name);
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedShop = await tx.shop.update({
        where: { id: shopId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "SHOP_UPDATED",
          entityType: "shop",
          entityId: shopId,
          metadata: data,
        },
      });

      return updatedShop;
    });

    return updated;
  },

  async getShop(sellerId: string, userId: string, shopId: string) {
    await shopAccessService.assertShopAccess(sellerId, userId, shopId);

    const shop = await db.shop.findFirst({
      where: { id: shopId, sellerId },
      include: {
        _count: { select: { products: true } },
      },
    });
    if (!shop) throw new Error("Shop not found");
    return resolveShopMediaUrls(shop);
  },

  async listShops(
    sellerId: string,
    userId: string,
    filters: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const accessibleShopIds = await shopAccessService.getAccessibleShopIds(sellerId, userId);
    const where: any = { sellerId };

    if (accessibleShopIds !== null) where.id = { in: accessibleShopIds };

    if (filters.status) {
      const STATUS_REVERSE: Record<string, string> = {
        active: "APPROVED",
        pending: "PENDING",
        inactive: "REJECTED",
        suspended: "SUSPENDED",
      };
      where.status =
        STATUS_REVERSE[filters.status] ?? filters.status.toUpperCase();
    }
    if (filters.search)
      where.name = { contains: filters.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      db.shop.findMany({
        where,
        select: {
          id: true,
          displayId: true,
          name: true,
          slug: true,
          category: true,
          description: true,
          status: true,
          logo: true,
          logoKey: true,
          banner: true,
          bannerKey: true,
          createdAt: true,
          pickupCity: true,
          pickupState: true,
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shop.count({ where }),
    ]);

    const STATUS_MAP: Record<string, string> = {
      PENDING: "pending",
      APPROVED: "active",
      REJECTED: "inactive",
      SUSPENDED: "suspended",
    };

    const withSignedUrls = await Promise.all(data.map(resolveShopMediaUrls));

    const mapped = withSignedUrls.map((s) => ({
      ...s,
      status: STATUS_MAP[s.status] ?? s.status.toLowerCase(),
    }));

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async listAllShops(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = {};
    if (filters.status) {
      const STATUS_REVERSE: Record<string, string> = {
        active: "APPROVED",
        pending: "PENDING",
        inactive: "REJECTED",
        suspended: "SUSPENDED",
      };
      where.status =
        STATUS_REVERSE[filters.status] ?? filters.status.toUpperCase();
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { slug: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.shop.findMany({
        where,
        select: {
          id: true,
          displayId: true,
          name: true,
          slug: true,
          category: true,
          description: true,
          status: true,
          logo: true,
          logoKey: true,
          banner: true,
          bannerKey: true,
          createdAt: true,
          contactEmail: true,
          contactPhone: true,
          pickupCity: true,
          pickupState: true,
          seller: { select: { id: true, name: true, businessName: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shop.count({ where }),
    ]);

    const STATUS_MAP: Record<string, string> = {
      PENDING: "pending",
      APPROVED: "active",
      REJECTED: "inactive",
      SUSPENDED: "suspended",
    };

    const withSignedUrls = await Promise.all(data.map(resolveShopMediaUrls));

    const mapped = withSignedUrls.map((s) => ({
      ...s,
      status: STATUS_MAP[s.status] ?? s.status.toLowerCase(),
    }));

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async setAutoAssign(sellerId: string, shopId: string, enabled: boolean) {
    const shop = await db.shop.findFirst({ where: { id: shopId, sellerId } });
    if (!shop) throw new Error("Shop not found");
    return db.shop.update({ where: { id: shopId }, data: { autoAssignEnabled: enabled } });
  },

  // async approveShop(shopId: string, actorId: string, note?: string) {
  //     const shop = await db.shop.findUnique({ where: { id: shopId } });
  //     if (!shop) throw new Error("Shop not found");
  //     if (shop.status !== "PENDING") throw new Error("Shop is not pending");

  //     return db.$transaction(async (tx) => {
  //         const updated = await tx.shop.update({
  //             where: { id: shopId },
  //             data: {
  //                 status: "APPROVED",
  //                 reviewedBy: actorId,
  //                 reviewNote: note ?? null,
  //                 reviewedAt: new Date(),
  //             },
  //         });

  //         await tx.auditLog.create({
  //             data: {
  //                 sellerId: shop.sellerId,
  //                 actorId,
  //                 actorType: "platform",
  //                 action: "SHOP_APPROVED",
  //                 entityType: "shop",
  //                 entityId: shopId,
  //                 metadata: { note },
  //             },
  //         });

  //         return updated;
  //     });
  // },

  // async rejectShop(shopId: string, actorId: string, reason: string) {
  //     const shop = await db.shop.findUnique({ where: { id: shopId } });
  //     if (!shop) throw new Error("Shop not found");
  //     if (shop.status !== "PENDING") throw new Error("Shop is not pending");

  //     return db.$transaction(async (tx) => {
  //         const updated = await tx.shop.update({
  //             where: { id: shopId },
  //             data: {
  //                 status: "REJECTED",
  //                 reviewedBy: actorId,
  //                 reviewNote: reason,
  //                 reviewedAt: new Date(),
  //             },
  //         });

  //         await tx.auditLog.create({
  //             data: {
  //                 sellerId: shop.sellerId,
  //                 actorId,
  //                 actorType: "platform",
  //                 action: "SHOP_REJECTED",
  //                 entityType: "shop",
  //                 entityId: shopId,
  //                 metadata: { reason },
  //             },
  //         });

  //         return updated;
  //     });
  // },

  // async listPendingShops() {
  //     return db.shop.findMany({
  //         where: { status: "PENDING" },
  //         select: {
  //             id: true,
  //             name: true,
  //             slug: true,
  //             category: true,
  //             status: true,
  //             createdAt: true,
  //             seller: {
  //                 select: { id: true, name: true, businessName: true },
  //             },
  //         },
  //         orderBy: { createdAt: "asc" },
  //     });
  // },
};
