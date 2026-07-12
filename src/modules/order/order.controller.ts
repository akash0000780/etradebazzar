import { Request, Response } from "express";
import { orderService } from "./order.service";
import { logger } from "../../utils/logger";
import { toCsv } from "../../utils/csv";

export const orderController = {
  async createOrder(req: Request, res: Response) {
    try {
      const customerId = req.user!.id;
      const result = await orderService.createOrder(customerId, req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Create order failed");
      const clientErrors = [
        "One or more products not found or not approved",
        "Sample orders limited to 2 items",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async createBulkOrder(req: Request, res: Response) {
    try {
      const customerId = req.user!.id;
      const { sellerId, items } = req.body;
      const file = req.file;

      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "XLS file required" });

      const parsedItems = typeof items === "string" ? JSON.parse(items) : items;
      const result = await orderService.createBulkOrder(
        customerId,
        sellerId,
        parsedItems,
        file,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Create bulk order failed");
      const clientErrors = [
        "XLS file is empty",
        "One or more products invalid",
      ];
      if (
        clientErrors.includes(error.message) ||
        error.message.startsWith("Missing columns")
      ) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async submitProposal(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const actorId = req.user!.id;
      const actorType = req.seller ? "seller" : "customer";
      const result = await orderService.submitProposal(
        orderId as string,
        actorId,
        actorType,
        req.body,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Submit proposal failed");
      const clientErrors = ["Order not found", "Order is not in negotiation"];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async respondToProposal(req: Request, res: Response) {
    try {
      const { orderId, negotiationId } = req.params;
      const actorId = req.user!.id;
      const actorType = req.seller ? "seller" : "customer";
      const result = await orderService.respondToProposal(
        orderId as string,
        negotiationId as string,
        actorId,
        actorType,
        req.body,
      );
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Respond to proposal failed");
      const clientErrors = [
        "Negotiation not found",
        "Proposal already responded to",
        "Order not found",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async assignShopToAddress(req: Request, res: Response) {
    try {
      const { orderId, addressId } = req.params;
      const actorId = req.user!.id;
      const sellerId = req.seller!.id;
      const { shopId } = req.body;
      const result = await orderService.assignShopToAddress(
        orderId as string,
        addressId as string,
        shopId,
        actorId,
        sellerId,
      );
      const updatedOrder = await orderService.getOrder(orderId as string);
      return res.json({ success: true, data: updatedOrder });
    } catch (error: any) {
      logger.error({ err: error.message }, "Assign shop to address failed");
      const clientErrors = [
        "Address not found",
        "Shop not found",
        "Shop not approved",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async setThreshold(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const result = await orderService.setThreshold(sellerId, req.body);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Set threshold failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async setCommission(req: Request, res: Response) {
    try {
      const actorId = req.user!.id;
      const result = await orderService.setCommission(actorId, req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Set commission failed");
      if (error.message === "Provide productId or category") {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async getOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const result = await orderService.getOrder(orderId as string);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Get order failed");
      if (error.message === "Order not found") {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async listOrders(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const { status, search, type, shopId, dateFrom, dateTo, page, limit } =
        req.query as Record<string, string>;
      const result = await orderService.listOrders(sellerId, {
        status,
        search,
        type,
        shopId,
        dateFrom,
        dateTo,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error: any) {
      logger.error({ err: error.message }, "List orders failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },
  async listAllOrders(req: Request, res: Response) {
    try {
      const {
        status,
        search,
        type,
        sellerId,
        shopId,
        dateFrom,
        dateTo,
        page,
        limit,
      } = req.query as Record<string, string>;
      const result = await orderService.listAllOrders({
        status,
        search,
        type,
        sellerId,
        shopId,
        dateFrom,
        dateTo,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error: any) {
      logger.error({ err: error.message }, "List all orders failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async bulkAction(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const actorId = req.user!.id;
      const result = await orderService.bulkAction(sellerId, actorId, req.body);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Bulk order action failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async bulkRespondNegotiations(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const actorId = req.user!.id;
      const result = await orderService.bulkRespondNegotiations(
        sellerId,
        actorId,
        req.body,
      );
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Bulk respond negotiations failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async getActionRequired(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const result = await orderService.getActionRequired(sellerId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Get action required failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },
  async exportOrdersCsv(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const { status, type, dateFrom, dateTo } = req.query as Record<
        string,
        string
      >;
      const orders = await orderService.exportOrdersCsv(sellerId, {
        status,
        type,
        dateFrom,
        dateTo,
      });

      const rows = orders.map((o) => ({
        orderId: o.displayId ?? o.id,
        type: o.type,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        finalAmount: o.finalAmount ? Number(o.finalAmount) : "",
        paymentStatus: o.paymentStatus,
        customerName: o.customer.name ?? "",
        customerEmail: o.customer.email,
        createdAt: o.createdAt.toISOString(),
      }));
      const csv = toCsv(rows, [
        "orderId",
        "type",
        "status",
        "totalAmount",
        "finalAmount",
        "paymentStatus",
        "customerName",
        "customerEmail",
        "createdAt",
      ]);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      return res.send(csv);
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async listBulkUploads(req: Request, res: Response) {
    try {
      const sellerId = req.seller!.id;
      const result = await orderService.listBulkUploads(sellerId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "List bulk uploads failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },
};
