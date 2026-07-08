import { db } from "../../db/index";
import { ShipmentFactory } from "../../lib/shipment/shipment.factory";
import { notificationService } from "../notification/notification.service";
import { logger } from "../../utils/logger";
import { triggerAnalyticsRefresh } from "../../lib/analytics/analytics.events";

export const returnService = {
  async createReturnRequest(
    customerId: string,
    data: { orderId: string; reason: string },
  ) {
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new Error("Order not found");
    if (order.customerId !== customerId) throw new Error("Unauthorized");
    if (order.status !== "DELIVERED")
      throw new Error("Order not delivered yet");

    const existing = await db.returnRequest.findFirst({
      where: { orderId: data.orderId, status: { not: "REJECTED" } },
    });
    if (existing) throw new Error("Return request already exists");

    const returnRequest = await db.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId: data.orderId,
          customerId,
          reason: data.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId: customerId,
          actorType: "customer",
          action: "RETURN_REQUESTED",
          entityType: "return_request",
          entityId: created.id,
          metadata: { reason: data.reason },
        },
      });

      return created;
    });

    const owner = await db.sellerMember.findFirst({
      where: { sellerId: order.sellerId, role: { name: "owner" } },
      select: { userId: true },
    });
    const seller = await db.seller.findUnique({
      where: { id: order.sellerId },
      select: { email: true, name: true },
    });

    if (owner && seller) {
      notificationService
        .notify({
          userId: owner.userId,
          email: seller.email,
          type: "RETURN_REQUESTED",
          title: "Return request received",
          message: `A return request has been raised for order #${data.orderId}`,
          channels: ["email", "sse"],
          data: { orderId: data.orderId, returnId: returnRequest.id },
        })
        .catch(() => null);
    }

    return returnRequest;
  },

  async approveReturn(returnId: string, actorId: string, note?: string) {
    const returnRequest = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: { items: { include: { product: true } }, addresses: true },
        },
      },
    });
    if (!returnRequest) throw new Error("Return request not found");
    if (returnRequest.status !== "PENDING")
      throw new Error("Return request not pending");

    const order = returnRequest.order;
    const address = order.addresses[0];
    if (!address) throw new Error("Order address not found");

    const shop = await db.shop.findFirst({
      where: { sellerId: order.sellerId },
      select: {
        name: true,
        contactEmail: true,
        pickupStreet: true,
        pickupCity: true,
        pickupPincode: true,
        pickupState: true,
        contactPhone: true,
      },
    });
    if (!shop) throw new Error("Shop not found");

    const provider = ShipmentFactory.get();
    let trackingId: string | null = null;
    let trackingUrl: string | null = null;

    try {
      const result = await provider.createReversePickup({
        orderId: returnRequest.id,
        pickupLocation: shop.name,
        receiverName: address.receiverName,
        address: address.street,
        city: address.city,
        pincode: address.pincode,
        state: address.state,
        country: "India",
        email: shop.contactEmail,
        phone: address.phone,
        paymentMethod: "Prepaid",
        subTotal: Number(order.totalAmount),
        length: 10,
        breadth: 10,
        height: 10,
        weight: order.items.reduce(
          (acc, item) =>
            acc + ((item.product.weightGrams ?? 500) * item.quantity) / 1000,
          0,
        ),
        items: order.items.map((item) => ({
          name: item.product.name,
          sku: item.product.sku ?? item.productId,
          units: item.quantity,
          sellingPrice: Number(item.finalUnitPrice ?? item.unitPrice),
          weight: (item.product.weightGrams ?? 500) / 1000,
        })),
      });
      trackingId = result.trackingId;
      trackingUrl = result.trackingUrl;
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        "Reverse pickup failed  approving without tracking",
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id: returnId },
        data: { status: "APPROVED", approvedBy: actorId, note: note ?? null },
      });

      await tx.returnShipment.create({
        data: {
          returnRequestId: returnId,
          trackingId,
          trackingUrl,
          status: trackingId ? "BOOKED" : "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId,
          actorType: "seller",
          action: "RETURN_APPROVED",
          entityType: "return_request",
          entityId: returnId,
          metadata: { note, trackingId },
        },
      });

      return result;
    });

    const customer = await db.user.findUnique({
      where: { id: returnRequest.customerId },
      select: { email: true, name: true },
    });

    if (customer) {
      notificationService
        .notify({
          userId: returnRequest.customerId,
          email: customer.email,
          type: "RETURN_APPROVED",
          title: "Return approved",
          message: `Your return request for order #${returnRequest.orderId} has been approved.`,
          channels: ["email", "sse"],
          data: { returnId, trackingId, trackingUrl },
        })
        .catch(() => null);
    }

    triggerAnalyticsRefresh("RETURN_COMPLETED", order.sellerId).catch(
      () => null,
    );
    return updated;
  },

  async rejectReturn(returnId: string, actorId: string, note: string) {
    const returnRequest = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: { order: { select: { sellerId: true } } },
    });
    if (!returnRequest) throw new Error("Return request not found");
    if (returnRequest.status !== "PENDING")
      throw new Error("Return request not pending");

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id: returnId },
        data: { status: "REJECTED", rejectedBy: actorId, note },
      });

      await tx.auditLog.create({
        data: {
          sellerId: returnRequest.order.sellerId,
          actorId,
          actorType: "seller",
          action: "RETURN_REJECTED",
          entityType: "return_request",
          entityId: returnId,
          metadata: { note },
        },
      });

      return result;
    });

    const customer = await db.user.findUnique({
      where: { id: returnRequest.customerId },
      select: { email: true, name: true },
    });

    if (customer) {
      notificationService
        .notify({
          userId: returnRequest.customerId,
          email: customer.email,
          type: "RETURN_REJECTED",
          title: "Return rejected",
          message: `Your return request for order #${returnRequest.orderId} was rejected. Reason: ${note}`,
          channels: ["email", "sse"],
        })
        .catch(() => null);
    }

    return updated;
  },

  async getReturnRequest(returnId: string) {
    const returnRequest = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          select: {
            id: true,
            displayId: true,
            type: true,
            totalAmount: true,
            sellerId: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        shipment: true,
      },
    });
    if (!returnRequest) throw new Error("Return request not found");
    return returnRequest;
  },

  async listReturnRequests(
    sellerId: string,
    filters: {
      status?: string;
      search?: string;
      reason?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: any = { order: { sellerId } };
    if (filters.status) where.status = filters.status;
    if (filters.reason)
      where.reason = { contains: filters.reason, mode: "insensitive" };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        {
          order: {
            displayId: { contains: filters.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      db.returnRequest.findMany({
        where,
        include: {
          shipment: {
            select: { trackingId: true, trackingUrl: true, status: true },
          },
          order: {
            select: {
              id: true,
              displayId: true,
              type: true,
              totalAmount: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.returnRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async listCustomerReturns(customerId: string) {
    return db.returnRequest.findMany({
      where: { customerId },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        order: { select: { id: true, type: true, totalAmount: true } },
        shipment: {
          select: { trackingId: true, trackingUrl: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
