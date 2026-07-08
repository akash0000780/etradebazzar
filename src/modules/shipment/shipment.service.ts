import { db } from "../../db/index";
import { ShipmentFactory } from "../../lib/shipment/shipment.factory";
import { notificationService } from "../notification/notification.service";
import { logger } from "../../utils/logger";
import { generateDisplayId } from "../../lib/uid/uid.generator";
import { creditEngine } from "../../lib/credit-engine/credit-rules";
import { reliabilityService } from "../../lib/order-assignment/reliability.service";

const STATUS_FORWARD_MAP: Record<string, string> = {
  PENDING: "pending", BOOKED: "booked", IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery", DELIVERED: "delivered",
  FAILED: "cancelled", RETURNED: "rto",
};
const STATUS_REVERSE_MAP: Record<string, string> = {
  pending: "PENDING", booked: "BOOKED", in_transit: "IN_TRANSIT",
  out_for_delivery: "OUT_FOR_DELIVERY", delivered: "DELIVERED",
  cancelled: "FAILED", rto: "RETURNED",
};

export const shipmentService = {
  async createShipment(
    orderId: string,
    shopId: string,
    orderAddressId?: string,
  ) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new Error("Order not found");
    if (order.status !== "CONFIRMED") throw new Error("Order not confirmed");

    const shop = await db.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new Error("Shop not found");

    const address = orderAddressId
      ? await db.orderAddress.findUnique({ where: { id: orderAddressId } })
      : await db.orderAddress.findFirst({ where: { orderId } });
    if (!address) throw new Error("Delivery address not found");

    const provider = ShipmentFactory.get();
    let trackingId: string | null = null;
    let trackingUrl: string | null = null;

    try {
      const result = await provider.createShipment({
        orderId,
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
        subTotal: Number(order.finalAmount ?? order.totalAmount),
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
        "Shipment provider unavailable  saving without tracking",
      );
    }

    const shipment = await db.$transaction(async (tx) => {
      const displayId = await generateDisplayId("shipment");
      const created = await tx.shipment.create({
        data: {
          orderId,
          shopId,
          orderAddressId: orderAddressId ?? null,
          displayId,
          provider: process.env.SHIPMENT_PROVIDER ?? "shiprocket",
          trackingId,
          trackingUrl,
          status: trackingId ? "BOOKED" : "PENDING",
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING" },
      });

      if (orderAddressId) {
        await tx.orderAddress.update({
          where: { id: orderAddressId },
          data: { fulfillmentStatus: "PROCESSING" },
        });
      }

      await tx.auditLog.create({
        data: {
          sellerId: order.sellerId,
          actorId: shopId,
          actorType: "shop",
          action: "SHIPMENT_CREATED",
          entityType: "shipment",
          entityId: created.id,
          metadata: { trackingId, orderId },
        },
      });

      return created;
    });

    const orderWithCustomer = await db.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        customer: { select: { email: true, name: true } },
      },
    });

    if (orderWithCustomer?.customer) {
      notificationService
        .shipmentUpdated({
          userId: orderWithCustomer.customerId,
          email: orderWithCustomer.customer.email,
          customerName: orderWithCustomer.customer.name ?? "Customer",
          orderId,
          status: shipment.status,
          trackingId: trackingId ?? undefined,
          trackingUrl: trackingUrl ?? undefined,
        })
        .catch(() => null);
    }

    return shipment;
  },

  async trackShipment(shipmentId: string) {
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new Error("Shipment not found");
    if (!shipment.trackingId) throw new Error("No tracking ID available yet");

    const provider = ShipmentFactory.get();

    try {
      const result = await provider.trackShipment(shipment.trackingId);

      const statusMap: Record<string, string> = {
        "DELIVERED": "DELIVERED",
        "IN TRANSIT": "IN_TRANSIT",
        "OUT FOR DELIVERY": "OUT_FOR_DELIVERY",
        "RETURNED": "RETURNED",
        "CANCELED": "FAILED",
      };

      const mappedStatus = statusMap[result.currentStatus.toUpperCase()];
      if (mappedStatus && mappedStatus !== shipment.status) {
        await db.shipment.update({
          where: { id: shipmentId },
          data: { status: mappedStatus as any },
        });

        const order = await db.order.findUnique({
          where: { id: shipment.orderId },
          select: {
            customerId: true,
            customer: { select: { email: true, name: true } },
          },
        });

        if (order?.customer) {
          notificationService
            .shipmentUpdated({
              userId: order.customerId,
              email: order.customer.email,
              customerName: order.customer.name ?? "Customer",
              orderId: shipment.orderId,
              status: mappedStatus,
              trackingId: shipment.trackingId ?? undefined,
              trackingUrl: shipment.trackingUrl ?? undefined,
            })
            .catch(() => null);
        }
      }

      return result.raw;
    } catch (err: any) {
      logger.warn({ err: err.message }, "Tracking unavailable");
      return { shipment, tracking: null };
    }
  },

  async cancelShipment(shipmentId: string, actorId: string) {
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });
    if (!shipment) throw new Error("Shipment not found");
    if (shipment.status === "DELIVERED")
      throw new Error("Cannot cancel delivered shipment");

    const provider = ShipmentFactory.get();

    try {
      if (shipment.trackingId) {
        await provider.cancelShipment([shipment.trackingId]);
      }
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        "Provider cancel failed  updating locally",
      );
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: "FAILED" },
      });

      await tx.auditLog.create({
        data: {
          sellerId: shipment.order.sellerId,
          actorId,
          actorType: "seller",
          action: "SHIPMENT_CANCELLED",
          entityType: "shipment",
          entityId: shipmentId,
        },
      });

      return updated;
    });
  },

  async handleWebhook(payload: any, signature: string) {
    const provider = ShipmentFactory.get();

    if (!provider.verifyWebhook(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    const event = provider.parseWebhookEvent(payload);
    logger.info(
      { event: event.event, status: event.status },
      "Shipment webhook received",
    );

    const shipment = await db.shipment.findFirst({
      where: { trackingId: event.trackingId },
    });
    if (!shipment) return { received: true };

    const statusMap: Record<string, string> = {
      "delivered": "DELIVERED",
      "in transit": "IN_TRANSIT",
      "out for delivery": "OUT_FOR_DELIVERY",
      "returned": "RETURNED",
      "canceled": "FAILED",
      "rto": "RETURNED",
    };

    const mappedStatus = statusMap[event.status.toLowerCase()];
    if (!mappedStatus || mappedStatus === shipment.status)
      return { received: true };

    await db.shipment.update({
      where: { id: shipment.id },
      data: { status: mappedStatus as any },
    });

    if (mappedStatus === "DELIVERED") {
      await db.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });

      const deliveredOrder = await db.order.findUnique({
        where: { id: shipment.orderId },
        select: { assignedShopId: true },
      });
      if (deliveredOrder?.assignedShopId) {
        reliabilityService.recomputeReliability(deliveredOrder.assignedShopId).catch(() => null);
      }
    }

    const orderForCredit = await db.order.findUnique({
      where: { id: shipment.orderId },
      select: { customerId: true },
    });
    if (orderForCredit) {
      creditEngine.awardOrderCompletion(orderForCredit.customerId, shipment.orderId).catch(() => null);
    }
    const order = await db.order.findUnique({
      where: { id: shipment.orderId },
      select: {
        customerId: true,
        customer: { select: { email: true, name: true } },
      },
    });

    if (order?.customer) {
      notificationService
        .shipmentUpdated({
          userId: order.customerId,
          email: order.customer.email,
          customerName: order.customer.name ?? "Customer",
          orderId: shipment.orderId,
          status: mappedStatus,
          trackingId: event.trackingId,
          trackingUrl: shipment.trackingUrl ?? undefined,
        })
        .catch(() => null);
    }

    return { received: true };
  },

  async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    weightKg: number,
    cod: boolean,
  ) {
    const provider = ShipmentFactory.get();
    return provider.getServiceability(
      pickupPincode,
      deliveryPincode,
      weightKg,
      cod,
    );
  },

  async listShipments(
    sellerId: string,
    filters: {
      status?: string; search?: string; shopId?: string; courierPartner?: string;
      dateFrom?: string; dateTo?: string; page?: number; limit?: number;
      sortBy?: string; sortOrder?: "asc" | "desc";
    }
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const allowedSort = ["createdAt", "estimatedDelivery"];
    const sortBy = allowedSort.includes(filters.sortBy ?? "") ? filters.sortBy! : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    const where: any = { order: { sellerId } };
    if (filters.status) where.status = STATUS_REVERSE_MAP[filters.status] ?? filters.status.toUpperCase();
    if (filters.shopId) where.shopId = filters.shopId;
    if (filters.courierPartner) where.provider = { equals: filters.courierPartner, mode: "insensitive" };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: "insensitive" } },
        { displayId: { contains: filters.search, mode: "insensitive" } },
        { trackingId: { contains: filters.search, mode: "insensitive" } },
        { order: { displayId: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const [rows, total] = await Promise.all([
      db.shipment.findMany({
        where,
        select: {
          id: true, displayId: true, status: true, trackingId: true, trackingUrl: true,
          provider: true, estimatedDelivery: true, createdAt: true,
          order: { select: { id: true, displayId: true, type: true, totalAmount: true } },
          shop: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shipment.count({ where }),
    ]);

    const data = rows.map(s => ({
      ...s,
      status: (STATUS_FORWARD_MAP[s.status] || s.status.toLowerCase()) as any,
      courierPartner: s.provider?.toLowerCase() as any,
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  },

  async getShipment(shipmentId: string) {
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
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
            addresses: true,
            customer: { select: { id: true, name: true } },
            seller: { select: { id: true, name: true } },
          },
        },
        orderAddress: true,
        shop: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!shipment) throw new Error("Shipment not found");

    const orderStatusMap: Record<string, string> = {
      PENDING: "pending",
      CONFIRMED: "confirmed",
      PROCESSING: "processing",
      NEGOTIATING: "negotiating",
      SHIPPED: "shipped",
      DELIVERED: "delivered",
      CANCELLED: "cancelled",
      RETURNED: "returned",
    };

    return {
      ...shipment,
      status: (STATUS_FORWARD_MAP[shipment.status] || shipment.status.toLowerCase()) as any,
      courierPartner: shipment.provider?.toLowerCase() as any,
      order: shipment.order
        ? {
          ...shipment.order,
          customerId: shipment.order.customerId,
          sellerId: shipment.order.sellerId,
          status: (orderStatusMap[shipment.order.status] ||
            shipment.order.status.toLowerCase()) as any,
          paymentStatus: (shipment.order.paymentStatus?.toLowerCase() ||
            "unpaid") as any,
          totalAmount: shipment.order.totalAmount
            ? Number(shipment.order.totalAmount)
            : undefined,
          total: shipment.order.totalAmount
            ? Number(shipment.order.totalAmount)
            : undefined,
          items: shipment.order.items.map((item) => ({
            ...item,
            price: Number(item.unitPrice),
            negotiatedPrice: item.finalUnitPrice
              ? Number(item.finalUnitPrice)
              : undefined,
            sku: item.sku?.sku || item.product?.sku,
          })),
          shippingAddress: shipment.orderAddress
            ? {
              name: shipment.orderAddress.receiverName,
              phone: shipment.orderAddress.phone,
              line1: shipment.orderAddress.street,
              line2: "",
              city: shipment.orderAddress.city,
              state: shipment.orderAddress.state,
              pincode: shipment.orderAddress.pincode,
              country: "India",
            }
            : shipment.order.addresses?.[0]
              ? {
                name: shipment.order.addresses[0].receiverName,
                phone: shipment.order.addresses[0].phone,
                line1: shipment.order.addresses[0].street,
                line2: "",
                city: shipment.order.addresses[0].city,
                state: shipment.order.addresses[0].state,
                pincode: shipment.order.addresses[0].pincode,
                country: "India",
              }
              : undefined,
        }
        : undefined,
    };
  },

  async getShipmentWithOrder(sellerId: string, shipmentId: string) {
    const shipment = await db.shipment.findFirst({
      where: { id: shipmentId, order: { sellerId } },
      include: {
        order: {
          select: {
            id: true,
            displayId: true,
            status: true,
            totalAmount: true,
            finalAmount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!shipment) throw new Error("Shipment not found");

    return {
      shipmentId: shipment.id,
      shipmentDisplayId: shipment.displayId ?? shipment.id,
      orderId: shipment.order.id,
      orderDisplayId: shipment.order.displayId ?? shipment.order.id,
      courierPartner: shipment.provider,
      AWB: shipment.trackingId,
      shipmentStatus: shipment.status,
      orderStatus: shipment.order.status,
      assignedDate: shipment.createdAt,
      deliveredDate:
        shipment.status === "DELIVERED" ? shipment.updatedAt : null,
      trackingUrl: shipment.trackingUrl,
    };
  },

  async listShipmentsWithOrders(sellerId: string) {
    const shipments = await db.shipment.findMany({
      where: { order: { sellerId } },
      include: {
        order: {
          select: {
            id: true,
            displayId: true,
            status: true,
            totalAmount: true,
            finalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return shipments.map((s) => ({
      shipmentId: s.id,
      shipmentDisplayId: s.displayId ?? s.id,
      orderId: s.order.id,
      orderDisplayId: s.order.displayId ?? s.order.id,
      courierPartner: s.provider,
      AWB: s.trackingId,
      shipmentStatus: s.status,
      orderStatus: s.order.status,
      assignedDate: s.createdAt,
      deliveredDate: s.status === "DELIVERED" ? s.updatedAt : null,
      trackingUrl: s.trackingUrl,
    }));
  },
  async bulkCancel(sellerId: string, actorId: string, shipmentIds: string[]) {
    let success = 0, failed = 0;

    for (const shipmentId of shipmentIds) {
      try {
        const shipment = await db.shipment.findFirst({
          where: { id: shipmentId, order: { sellerId } },
        });
        if (!shipment) { failed++; continue; }

        await this.cancelShipment(shipmentId, actorId);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  },
  async exportShipmentsCsv(sellerId: string) {
    return db.shipment.findMany({
      where: { order: { sellerId } },
      select: {
        id: true, displayId: true, status: true, provider: true, trackingId: true,
        createdAt: true, order: { select: { displayId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
