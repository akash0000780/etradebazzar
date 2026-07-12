import { db } from "../../db/index";
import { getCommissionRate, isHighTicket } from "../../utils/commission";
import { notificationService } from "../notification/notification.service";
import { checkLowStock } from "../../lib/inventory/inventory.alert";
import { triggerAnalyticsRefresh } from "../../lib/analytics/analytics.events";
import { generateDisplayId } from "../../lib/uid/uid.generator";
import { creditEngine } from "../../lib/credit-engine/credit-rules";
import { recommendationService } from "../../lib/order-assignment/recommendation.service";
import { reliabilityService } from "../../lib/order-assignment/reliability.service";

async function getCustomerContact(customerId: string) {
  return db.user.findUnique({
    where: { id: customerId },
    select: { email: true, name: true },
  });
}

export const orderService = {
  async createOrder(
    customerId: string,
    data: {
      sellerId: string;
      type: "STANDARD" | "SAMPLE";
      items: { productId: string; quantity: number }[];
      deliveryAddress: {
        receiverName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
        latitude?: number;
        longitude?: number;
      };
    },
  ) {
    const products = await db.product.findMany({
      where: {
        id: { in: data.items.map((i) => i.productId) },
        sellerId: data.sellerId,
        status: "APPROVED",
      },
      include: { category: { select: { name: true } } },
    });

    if (products.length !== data.items.length) {
      throw new Error("One or more products not found or not approved");
    }

    if (
      data.type === "SAMPLE" &&
      data.items.reduce((a, b) => a + b.quantity, 0) > 2
    ) {
      throw new Error("Sample orders limited to 2 items");
    }

    let totalAmount = 0;
    const itemsData = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.price);
      totalAmount += unitPrice * item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice };
    });

    const categoryName = products[0]!.category.name;
    const highTicket = await isHighTicket(
      data.sellerId,
      categoryName,
      totalAmount,
    );
    const orderType = highTicket ? "HIGH_TICKET" : data.type;
    const commissionRate = await getCommissionRate(
      products[0]!.id,
      categoryName,
    );
    const commissionAmount = (totalAmount * commissionRate) / 100;

    const displayId = await generateDisplayId("order");

    let initialStatus: "NEGOTIATING" | "PENDING_ASSIGNMENT" | "CONFIRMED" =
      highTicket ? "NEGOTIATING" : "PENDING_ASSIGNMENT";
    let autoAssignedShopId: string | null = null;

    if (!highTicket) {
      const trusted = await recommendationService.hasTrustedShops(
        data.sellerId,
      );
      if (trusted) {
        const recs = await recommendationService.computeRecommendations(
          data.sellerId,
          data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          data.deliveryAddress.latitude,
          data.deliveryAddress.longitude,
        );
        const topPick = recs[0];
        if (topPick?.autoAssignEnabled && topPick.stockScore >= 80) {
          initialStatus = "CONFIRMED";
          autoAssignedShopId = topPick.shopId;
        }
      }
    }

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          sellerId: data.sellerId,
          customerId,
          type: orderType,
          displayId,
          status: initialStatus,
          totalAmount,
          commissionRate,
          commissionAmount,
          assignedShopId: autoAssignedShopId,
          items: { create: itemsData },
          addresses: {
            create: {
              ...data.deliveryAddress,
              assignedShopId: autoAssignedShopId,
              fulfillmentStatus: autoAssignedShopId ? "ASSIGNED" : "PENDING",
            },
          },
        },
        include: { items: true, addresses: true },
      });

      for (const item of itemsData) {
        const product = products.find((p) => p.id === item.productId)!;
        const prevStock = product.stock ?? 0;
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(
            `Insufficient stock for product: ${products.find((p) => p.id === item.productId)!.name}`,
          );
        }
        checkLowStock(
          item.productId,
          prevStock,
          prevStock - item.quantity,
        ).catch(() => null);
      }

      await tx.auditLog.create({
        data: {
          sellerId: data.sellerId,
          actorId: customerId,
          actorType: "customer",
          action: "ORDER_CREATED",
          entityType: "order",
          entityId: created.id,
          metadata: { type: orderType, totalAmount },
        },
      });

      return created;
    });

    if (autoAssignedShopId) {
      db.auditLog
        .create({
          data: {
            sellerId: data.sellerId,
            actorId: customerId,
            actorType: "system",
            action: "SHOP_AUTO_ASSIGNED",
            entityType: "order",
            entityId: order.id,
            metadata: { shopId: autoAssignedShopId },
          },
        })
        .catch(() => null);
    }

    triggerAnalyticsRefresh("ORDER_CREATED", data.sellerId).catch(() => null);

    const customer = await getCustomerContact(customerId);
    if (customer) {
      notificationService
        .orderPlaced({
          userId: customerId,
          email: customer.email,
          customerName: customer.name ?? "Customer",
          orderId: order.id,
          orderType,
          items: itemsData.map((i) => {
            const p = products.find((p) => p.id === i.productId)!;
            return {
              name: p.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            };
          }),
          totalAmount,
        })
        .catch(() => null);
    }

    return order;
  },

  async createBulkOrder(
    customerId: string,
    sellerId: string,
    items: { productId: string; quantity: number }[],
    file: Express.Multer.File,
  ) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("XLS file is empty");
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("XLS file is empty");
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    if (!rows.length) throw new Error("XLS file is empty");

    const requiredCols = [
      "receiverName",
      "phone",
      "street",
      "city",
      "state",
      "pincode",
    ];
    const missing = requiredCols.filter((col) => !(col in rows[0]));
    if (missing.length)
      throw new Error(`Missing columns: ${missing.join(", ")}`);

    const products = await db.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        sellerId,
        status: "APPROVED",
      },
      include: { category: { select: { name: true } } },
    });
    if (products.length !== items.length)
      throw new Error("One or more products invalid");

    let totalAmount = 0;
    const itemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.price);
      totalAmount += unitPrice * item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice };
    });

    const commissionRate = await getCommissionRate(
      products[0]!.id,
      products[0]!.category.name,
    );
    const commissionAmount = (totalAmount * commissionRate) / 100;

    const displayId = await generateDisplayId("order");

    return db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          sellerId,
          customerId,
          type: "BULK",
          displayId,
          status: "PENDING",
          totalAmount,
          commissionRate,
          commissionAmount,
          items: { create: itemsData },
          addresses: {
            create: rows.map((row: any) => ({
              receiverName: String(row.receiverName),
              phone: String(row.phone),
              street: String(row.street),
              city: String(row.city),
              state: String(row.state),
              pincode: String(row.pincode),
              latitude: row.latitude ? Number(row.latitude) : null,
              longitude: row.longitude ? Number(row.longitude) : null,
            })),
          },
        },
        include: { addresses: true },
      });

      for (const item of itemsData) {
        const product = products.find((p) => p.id === item.productId)!;
        const prevStock = product.stock ?? 0;
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(
            `Insufficient stock for product: ${products.find((p) => p.id === item.productId)!.name}`,
          );
        }
        checkLowStock(
          item.productId,
          prevStock,
          prevStock - item.quantity,
        ).catch(() => null);
      }

      await tx.bulkUpload.create({
        data: {
          orderId: order.id,
          uploadedBy: customerId,
          fileName: file.originalname,
          status: "COMPLETED",
          totalAddresses: rows.length,
          assignedCount: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId: customerId,
          actorType: "customer",
          action: "BULK_ORDER_CREATED",
          entityType: "order",
          entityId: order.id,
          metadata: { totalAddresses: rows.length },
        },
      });

      return order;
    });
  },
  async submitProposal(
    orderId: string,
    actorId: string,
    actorType: string,
    data: { proposedPrice: number; note?: string; meetLink?: string },
  ) {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.status !== "NEGOTIATING")
      throw new Error("Order is not in negotiation");

    return db.$transaction(async (tx) => {
      const negotiation = await tx.orderNegotiation.create({
        data: {
          orderId,
          proposedBy: actorId,
          proposedByType: actorType,
          proposedPrice: data.proposedPrice,
          note: data.note,
          meetLink: data.meetLink,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId,
          actorType,
          action: "PROPOSAL_SUBMITTED",
          entityType: "order_negotiation",
          entityId: negotiation.id,
          metadata: { proposedPrice: data.proposedPrice },
        },
      });

      return negotiation;
    });
  },

  async respondToProposal(
    orderId: string,
    negotiationId: string,
    actorId: string,
    actorType: string,
    data: {
      action: "ACCEPT" | "REJECT" | "COUNTER";
      counterPrice?: number;
      note?: string;
    },
  ) {
    const negotiation = await db.orderNegotiation.findFirst({
      where: { id: negotiationId, orderId },
    });
    if (!negotiation) throw new Error("Negotiation not found");
    if (negotiation.status !== "PENDING")
      throw new Error("Proposal already responded to");

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");

    const result = await db.$transaction(async (tx) => {
      const newStatus =
        data.action === "ACCEPT"
          ? "ACCEPTED"
          : data.action === "REJECT"
            ? "REJECTED"
            : "COUNTERED";

      await tx.orderNegotiation.update({
        where: { id: negotiationId },
        data: { status: newStatus },
      });

      if (data.action === "ACCEPT") {
        await tx.order.update({
          where: { id: orderId },
          data: { finalAmount: negotiation.proposedPrice, status: "CONFIRMED" },
        });
      }

      if (data.action === "COUNTER" && data.counterPrice) {
        await tx.orderNegotiation.create({
          data: {
            orderId,
            proposedBy: actorId,
            proposedByType: actorType,
            proposedPrice: data.counterPrice,
            note: data.note,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId,
          actorType,
          action: `PROPOSAL_${data.action}ED`,
          entityType: "order_negotiation",
          entityId: negotiationId,
          metadata: { action: data.action, counterPrice: data.counterPrice },
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: { negotiations: true },
      });
    });

    // Notify customer on accept
    if (data.action === "ACCEPT") {
      const customer = await getCustomerContact(order.customerId);
      if (customer) {
        notificationService
          .orderConfirmed({
            userId: order.customerId,
            email: customer.email,
            customerName: customer.name ?? "Customer",
            orderId,
            finalAmount: Number(negotiation.proposedPrice),
          })
          .catch(() => null);
      }
      triggerAnalyticsRefresh("ORDER_CREATED", order.sellerId).catch(
        () => null,
      );
    }

    return result;
  },

  async assignShopToAddress(
    orderId: string,
    addressId: string,
    shopId: string,
    actorId: string,
    sellerId: string,
  ) {
    const address = await db.orderAddress.findFirst({
      where: { id: addressId, orderId },
    });
    if (!address) throw new Error("Address not found");

    const shop = await db.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new Error("Shop not found");
    if (shop.status !== "APPROVED") throw new Error("Shop not approved");

    return db.$transaction(async (tx) => {
      const updated = await tx.orderAddress.update({
        where: { id: addressId },
        data: {
          assignedShopId: shopId,
          assignedBy: actorId,
          fulfillmentStatus: "ASSIGNED",
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { assignedShopId: shopId },
      });

      await tx.bulkUpload.updateMany({
        where: { orderId },
        data: { assignedCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          sellerId,
          actorId,
          actorType: "seller",
          action: "SHOP_ASSIGNED_TO_ADDRESS",
          entityType: "order_address",
          entityId: addressId,
          metadata: { shopId },
        },
      });

      return updated;
    });
  },

  async setThreshold(
    sellerId: string,
    data: { productCategory?: string; amount: number },
  ) {
    return db.orderThreshold.upsert({
      where: {
        sellerId_productCategory: {
          sellerId,
          productCategory: (data.productCategory as string) ?? null,
        },
      },
      update: { amount: data.amount },
      create: {
        sellerId,
        productCategory: data.productCategory,
        amount: data.amount,
      },
    });
  },

  async setCommission(
    actorId: string,
    data: { productId?: string; category?: string; rate: number },
  ) {
    if (!data.productId && !data.category)
      throw new Error("Provide productId or category");
    return db.productCommission.create({
      data: {
        productId: data.productId,
        category: data.category,
        rate: data.rate,
        setBy: actorId,
      },
    });
  },

  async getOrder(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                images: { orderBy: { order: "asc" }, take: 1 },
              },
            },
            sku: true,
          },
        },
        negotiations: { orderBy: { createdAt: "desc" } },
        addresses: true,
        assignedShop: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true } },
        shipments: true,
        payments: true,
      },
    });
    if (!order) throw new Error("Order not found");

    // Map backend fields to frontend expected field names
    return {
      ...order,
      shopId: order.assignedShopId,
      status: order.status.toLowerCase(),
      paymentStatus: (order.paymentStatus as string).toLowerCase(),
      totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
      finalAmount: order.finalAmount ? Number(order.finalAmount) : null,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.unitPrice),
        negotiatedPrice: item.finalUnitPrice
          ? Number(item.finalUnitPrice)
          : undefined,
        sku: item.sku?.sku || item.product?.sku,
      })),
      addresses: order.addresses.map((addr) => ({
        ...addr,
        shopId: addr.assignedShopId,
        assignmentStatus: addr.fulfillmentStatus.toLowerCase(),
      })),
    };
  },

  async listOrders(
    sellerId: string,
    filters: {
      status?: string;
      search?: string;
      type?: string;
      shopId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = { sellerId };
    if (filters.status) where.status = filters.status.toUpperCase();
    if (filters.type) where.type = filters.type.toUpperCase();
    if (filters.shopId) where.assignedShopId = filters.shopId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        { displayId: { contains: filters.search, mode: "insensitive" } },
        {
          customer: { name: { contains: filters.search, mode: "insensitive" } },
        },
      ];
    }

    const [data, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          customer: { select: { id: true, name: true } },
          addresses: true,
          assignedShop: { select: { id: true, name: true } },
          negotiations: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    const mapped = data.map((o) => {
      const latestNeg = o.negotiations?.[0];
      return {
        ...o,
        shopId: o.assignedShopId,
        status: o.status.toLowerCase(),
        paymentStatus: (o.paymentStatus as string).toLowerCase(),
        totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
        finalAmount: o.finalAmount ? Number(o.finalAmount) : null,
        commissionAmount: o.commissionAmount
          ? Number(o.commissionAmount)
          : null,
        addresses: o.addresses.map((addr) => ({
          ...addr,
          shopId: addr.assignedShopId,
          assignmentStatus: addr.fulfillmentStatus.toLowerCase(),
        })),
        negotiation: latestNeg
          ? {
              id: latestNeg.id,
              orderId: latestNeg.orderId,
              proposedBy:
                latestNeg.proposedByType === "customer" ? "customer" : "seller",
              proposedAmount: Number(latestNeg.proposedPrice),
              message: latestNeg.note ?? undefined,
              status: latestNeg.status.toLowerCase(),
              createdAt: latestNeg.createdAt,
              expiresAt: undefined,
            }
          : undefined,
      };
    });

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async listAllOrders(filters: {
    status?: string;
    search?: string;
    type?: string;
    sellerId?: string;
    shopId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = {};
    if (filters.status) where.status = filters.status.toUpperCase();
    if (filters.type) where.type = filters.type.toUpperCase();
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.shopId) where.assignedShopId = filters.shopId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        { displayId: { contains: filters.search, mode: "insensitive" } },
        {
          customer: { name: { contains: filters.search, mode: "insensitive" } },
        },
      ];
    }

    const [data, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          customer: { select: { id: true, name: true } },
          seller: { select: { id: true, businessName: true } },
          addresses: true,
          assignedShop: { select: { id: true, name: true } },
          negotiations: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    const mapped = data.map((o) => {
      const latestNeg = o.negotiations?.[0];
      return {
        ...o,
        shopId: o.assignedShopId,
        status: o.status.toLowerCase(),
        paymentStatus: (o.paymentStatus as string).toLowerCase(),
        totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
        finalAmount: o.finalAmount ? Number(o.finalAmount) : null,
        commissionAmount: o.commissionAmount
          ? Number(o.commissionAmount)
          : null,
        addresses: o.addresses.map((addr) => ({
          ...addr,
          shopId: addr.assignedShopId,
          assignmentStatus: addr.fulfillmentStatus.toLowerCase(),
        })),
        negotiation: latestNeg
          ? {
              id: latestNeg.id,
              orderId: latestNeg.orderId,
              proposedBy:
                latestNeg.proposedByType === "customer" ? "customer" : "seller",
              proposedAmount: Number(latestNeg.proposedPrice),
              message: latestNeg.note ?? undefined,
              status: latestNeg.status.toLowerCase(),
              createdAt: latestNeg.createdAt,
              expiresAt: undefined,
            }
          : undefined,
      };
    });

    return {
      data: mapped,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async cancelOrder(orderId: string, actorId: string, actorType: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");
    if (["DELIVERED", "CANCELLED"].includes(order.status))
      throw new Error("Order cannot be cancelled");

    const result = await db.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId,
          actorType,
          action: "ORDER_CANCELLED",
          entityType: "order",
          entityId: orderId,
        },
      });

      return updated;
    });

    if (order.assignedShopId) {
      reliabilityService
        .recomputeReliability(order.assignedShopId)
        .catch(() => null);
    }

    creditEngine
      .checkCancelPenalty(order.customerId, orderId, order.createdAt)
      .catch(() => null);

    triggerAnalyticsRefresh("ORDER_CANCELLED", order.sellerId).catch(
      () => null,
    );
    return result;
  },

  async bulkAction(
    sellerId: string,
    actorId: string,
    data: { orderIds: string[]; action: "confirm" | "cancel" | "ship" },
  ) {
    const statusMap = {
      confirm: "CONFIRMED",
      cancel: "CANCELLED",
      ship: "SHIPPED",
    } as const;
    const targetStatus = statusMap[data.action];

    let success = 0,
      failed = 0;

    for (const orderId of data.orderIds) {
      try {
        const order = await db.order.findFirst({
          where: { id: orderId, sellerId },
        });
        if (!order) {
          failed++;
          continue;
        }

        if (data.action === "cancel") {
          await this.cancelOrder(orderId, actorId, "seller");
        } else {
          await db.order.update({
            where: { id: orderId },
            data: { status: targetStatus },
          });
        }
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  },

  async bulkRespondNegotiations(
    sellerId: string,
    actorId: string,
    data: {
      orderIds: string[];
      action: "ACCEPT" | "REJECT";
      counterPrice?: number;
      note?: string;
    },
  ) {
    let success = 0,
      failed = 0;

    for (const orderId of data.orderIds) {
      try {
        const order = await db.order.findFirst({
          where: { id: orderId, sellerId },
        });
        if (!order) {
          failed++;
          continue;
        }

        const negotiation = await db.orderNegotiation.findFirst({
          where: { orderId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        });
        if (!negotiation) {
          failed++;
          continue;
        }

        await this.respondToProposal(
          orderId,
          negotiation.id,
          actorId,
          "seller",
          {
            action: data.action,
            counterPrice: data.counterPrice,
            note: data.note,
          },
        );
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  },

  async getActionRequired(sellerId: string) {
    const expiryThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000); // negotiations older 48 hrs

    const [pendingOrders, expiringNegotiations] = await Promise.all([
      db.order.findMany({
        where: { sellerId, status: { in: ["PENDING", "PROCESSING"] } },
        select: {
          id: true,
          displayId: true,
          type: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      db.order.findMany({
        where: {
          sellerId,
          status: "NEGOTIATING",
          negotiations: {
            some: { status: "PENDING", createdAt: { lte: expiryThreshold } },
          },
        },
        select: {
          id: true,
          displayId: true,
          type: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
    ]);

    return { pendingOrders, expiringNegotiations };
  },

  async exportOrdersCsv(
    sellerId: string,
    filters: {
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: any = { sellerId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    return db.order.findMany({
      where,
      select: {
        id: true,
        displayId: true,
        type: true,
        status: true,
        totalAmount: true,
        finalAmount: true,
        paymentStatus: true,
        createdAt: true,
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listBulkUploads(sellerId: string) {
    const uploads = await db.bulkUpload.findMany({
      where: { order: { sellerId } },
      include: {
        order: {
          select: {
            id: true,
            displayId: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return uploads.map((u) => ({
      id: u.id,
      orderId: u.orderId,
      orderDisplayId: u.order.displayId,
      orderStatus: u.order.status.toLowerCase(),
      totalAmount: u.order.totalAmount ? Number(u.order.totalAmount) : null,
      uploadedBy: u.uploadedBy,
      fileName: u.fileName,
      status: u.status.toLowerCase(),
      totalAddresses: u.totalAddresses,
      assignedCount: u.assignedCount,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },
};
