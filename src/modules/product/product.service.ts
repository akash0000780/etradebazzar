import { db } from "../../db/index";
import { notificationService } from "../notification/notification.service";
import { generateDisplayId } from "../../lib/uid/uid.generator";
import { resolveImageUrls } from "./product-image.service";

export const productService = {
  async createProduct(
    sellerId: string,
    actorId: string,
    data: {
      shopId?: string;
      name: string;
      description?: string;
      price?: number;
      compareAtPrice?: number;
      sku?: string;
      stock?: number;
      lowStockThreshold?: number;
      categoryId: string;
      weightGrams?: number;
      length?: number;
      width?: number;
      height?: number;
      isDigital: boolean;
    },
  ) {
    if (data.shopId) {
      const shop = await db.shop.findFirst({
        where: { id: data.shopId, sellerId },
      });
      if (!shop) throw new Error("Shop not found");
      if (shop.status !== "APPROVED") throw new Error("Shop not approved");
    }

    if (data.sku) {
      const existing = await db.product.findUnique({
        where: { sku: data.sku },
      });
      if (existing) throw new Error("SKU already exists");
    }

    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC not submitted");
    if (kyc.status !== "VERIFIED") throw new Error("KYC not verified");

    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) throw new Error("Category not found");

    const displayId = await generateDisplayId("product");

    return db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          shopId: data.shopId ?? null,
          categoryId: data.categoryId,
          displayId,
          name: data.name,
          description: data.description,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          sku: data.sku,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          weightGrams: data.weightGrams,
          length: data.length,
          width: data.width,
          height: data.height,
          isDigital: data.isDigital,
        },
      });

      if (data.sku) {
        await tx.productSKU.create({
          data: {
            productId: product.id,
            sku: data.sku,
            price: data.price ?? 0,
            stock: data.stock ?? 0,
            minQuantity: 1,
            options: {},
          },
        });
      }

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "PRODUCT_CREATED",
          entityType: "product",
          entityId: product.id,
          metadata: { name: data.name, shopId: data.shopId ?? null },
        },
      });

      return product;
    });
  },

  async updateProduct(
    sellerId: string,
    actorId: string,
    productId: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      compareAtPrice: number;
      sku: string;
      stock: number;
      categoryId: string;
      weightGrams: number;
      length: number;
      width: number;
      height: number;
      isDigital: boolean;
    }>,
  ) {
    const product = await db.product.findFirst({
      where: { id: productId, sellerId },
    });
    if (!product) throw new Error("Product not found");
    if (product.status === "REJECTED")
      throw new Error("Cannot update rejected product");

    if (data.sku && data.sku !== product.sku) {
      const existing = await db.product.findUnique({
        where: { sku: data.sku },
      });
      if (existing) throw new Error("SKU already exists");
    }

    if (data.categoryId) {
      const category = await db.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) throw new Error("Category not found");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data,
      });

      if (data.sku) {
        const existingSku = await tx.productSKU.findUnique({
          where: { sku: product.sku || "" },
        });

        if (existingSku && data.sku !== product.sku) {
          await tx.productSKU.update({
            where: { id: existingSku.id },
            data: {
              sku: data.sku,
              ...(data.price !== undefined && { price: data.price }),
              ...(data.stock !== undefined && { stock: data.stock }),
            },
          });
        } else if (!existingSku && data.sku !== product.sku) {
          await tx.productSKU.create({
            data: {
              productId,
              sku: data.sku,
              price: data.price ?? product.price ?? 0,
              stock: data.stock ?? product.stock ?? 0,
              minQuantity: 1,
              options: {},
            },
          });
        } else if (existingSku) {
          await tx.productSKU.update({
            where: { id: existingSku.id },
            data: {
              ...(data.price !== undefined && { price: data.price }),
              ...(data.stock !== undefined && { stock: data.stock }),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "PRODUCT_UPDATED",
          entityType: "product",
          entityId: productId,
          metadata: data as any,
        },
      });

      return updated;
    });
  },

  async getProduct(sellerId: string, productId: string) {
    const product = await db.product.findFirst({
      where: { id: productId, sellerId },
      include: {
        images: { orderBy: { order: "asc" } },
        skus: true,
        shop: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new Error("Product not found");

    const seller = await db.seller.findUnique({
      where: { id: product.sellerId },
      select: { id: true, name: true, businessName: true },
    });

    const images = await resolveImageUrls(product.images);

    return {
      ...product,
      seller,
      images,
      status: product.status.toLowerCase(),
      price: product.price ? Number(product.price) : null,
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null,
    };
  },

  async getProductById(productId: string) {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: "asc" } },
        skus: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            seller: { select: { id: true, name: true, businessName: true } },
          },
        },
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new Error("Product not found");

    const seller = await db.seller.findUnique({
      where: { id: product.sellerId },
      select: { id: true, name: true, businessName: true },
    });

    const images = await resolveImageUrls(product.images);

    return {
      ...product,
      seller,
      images,
      status: product.status.toLowerCase(),
      price: product.price ? Number(product.price) : null,
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null,
    };
  },

  async listProducts(
    sellerId: string,
    filters: {
      shopId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = { sellerId };
    if (filters.shopId) where.shopId = filters.shopId;
    if (filters.status) {
      const STATUS_MAP: Record<string, string> = {
        pending: "PENDING",
        approved: "APPROVED",
        rejected: "REJECTED",
        draft: "DRAFT",
        archived: "ARCHIVED",
      };
      where.status = STATUS_MAP[filters.status] ?? filters.status.toUpperCase();
    }
    if (filters.search)
      where.name = { contains: filters.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          images: { orderBy: { order: "asc" } },
          skus: true,
          shop: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    const mapped = data.map((p) => ({
      ...p,
      status: p.status.toLowerCase(),
      price: p.price ? Number(p.price) : null,
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    }));

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async approveProduct(productId: string, actorId: string, note?: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.status !== "PENDING") throw new Error("Product is not pending");

    const [updated, owner, seller] = await Promise.all([
      db.$transaction(async (tx) => {
        const result = await tx.product.update({
          where: { id: productId },
          data: {
            status: "APPROVED",
            reviewedBy: actorId,
            reviewNote: note ?? null,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            sellerId: product.sellerId,
            actorId,
            actorType: "platform",
            action: "PRODUCT_APPROVED",
            entityType: "product",
            entityId: productId,
            metadata: { note },
          },
        });

        return result;
      }),
      db.sellerMember.findFirst({
        where: { sellerId: product.sellerId, role: { name: "owner" } },
        select: { userId: true },
      }),
      db.seller.findUnique({
        where: { id: product.sellerId },
        select: { email: true, name: true },
      }),
    ]);

    if (owner && seller) {
      notificationService
        .productApproved({
          userId: owner.userId,
          email: seller.email,
          sellerName: seller.name,
          productName: product.name,
          note,
        })
        .catch(() => null);
    }

    return updated;
  },

  async rejectProduct(productId: string, actorId: string, reason: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.status !== "PENDING") throw new Error("Product is not pending");

    const [updated, owner, seller] = await Promise.all([
      db.$transaction(async (tx) => {
        const result = await tx.product.update({
          where: { id: productId },
          data: {
            status: "REJECTED",
            reviewedBy: actorId,
            reviewNote: reason,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            sellerId: product.sellerId,
            actorId,
            actorType: "platform",
            action: "PRODUCT_REJECTED",
            entityType: "product",
            entityId: productId,
            metadata: { reason },
          },
        });

        return result;
      }),
      db.sellerMember.findFirst({
        where: { sellerId: product.sellerId, role: { name: "owner" } },
        select: { userId: true },
      }),
      db.seller.findUnique({
        where: { id: product.sellerId },
        select: { email: true, name: true },
      }),
    ]);

    if (owner && seller) {
      notificationService
        .productRejected({
          userId: owner.userId,
          email: seller.email,
          sellerName: seller.name,
          productName: product.name,
          reason,
        })
        .catch(() => null);
    }

    return updated;
  },

  async listPendingProducts() {
    const products = await db.product.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        status: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            seller: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return products.map((p) => ({
      ...p,
      status: p.status.toLowerCase(),
      price: p.price ? Number(p.price) : null,
    }));
  },

  async listAllProducts(filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const STATUS_MAP: Record<string, string> = {
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
      draft: "DRAFT",
      archived: "ARCHIVED",
    };

    const where: any = {};
    if (filters.status && filters.status !== "all") {
      where.status = STATUS_MAP[filters.status] ?? filters.status.toUpperCase();
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        select: {
          id: true,
          displayId: true,
          name: true,
          price: true,
          category: true,
          sku: true,
          status: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              seller: { select: { id: true, name: true, businessName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    const mapped = data.map((p) => ({
      ...p,
      status: p.status.toLowerCase(),
      price: p.price ? Number(p.price) : null,
    }));

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async deleteProduct(sellerId: string, actorId: string, productId: string) {
    const product = await db.product.findFirst({
      where: { id: productId, sellerId },
    });
    if (!product) throw new Error("Product not found");
    if (product.status === "APPROVED")
      throw new Error("Cannot delete approved product");

    return db.$transaction(async (tx) => {
      await tx.product.delete({ where: { id: productId } });

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "PRODUCT_DELETED",
          entityType: "product",
          entityId: productId,
        },
      });
    });
  },
  async bulkAction(
    sellerId: string,
    actorId: string,
    data: {
      productIds: string[];
      action: "change_status" | "assign_shop" | "delete";
      status?: "PENDING" | "APPROVED" | "REJECTED";
      shopId?: string;
    },
  ) {
    let success = 0,
      failed = 0;

    for (const productId of data.productIds) {
      try {
        const product = await db.product.findFirst({
          where: { id: productId, sellerId },
        });
        if (!product) {
          failed++;
          continue;
        }

        if (data.action === "change_status" && data.status) {
          await db.product.update({
            where: { id: productId },
            data: { status: data.status },
          });
        } else if (data.action === "assign_shop" && data.shopId) {
          const shop = await db.shop.findFirst({
            where: { id: data.shopId, sellerId },
          });
          if (!shop) {
            failed++;
            continue;
          }
          await db.product.update({
            where: { id: productId },
            data: { shopId: data.shopId },
          });
        } else if (data.action === "delete") {
          if (product.status === "APPROVED") {
            failed++;
            continue;
          }
          await db.product.delete({ where: { id: productId } });
        } else {
          failed++;
          continue;
        }
        success++;
      } catch {
        failed++;
      }
    }

    await db.auditLog.create({
      data: {
        sellerId,
        actorId,
        actorType: "seller",
        action: "PRODUCT_BULK_ACTION",
        entityType: "product",
        entityId: "bulk",
        metadata: { action: data.action, success, failed },
      },
    });

    return { success, failed };
  },
  async exportProductsCsv(sellerId: string, shopId?: string) {
    return db.product.findMany({
      where: { sellerId, ...(shopId && { shopId }) },
      select: {
        id: true,
        displayId: true,
        name: true,
        price: true,
        stock: true,
        status: true,
        sku: true,
        createdAt: true,
        shop: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
