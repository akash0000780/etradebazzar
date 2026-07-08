import { Request, Response } from "express";
import { customerService } from "./customer.service";
import { logger } from "../../utils/logger";

export const customerController = {
    async register(req: Request, res: Response) {
        try {
            const result = await customerService.register(req.body);
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Customer registration failed");
            if (error.message === "Email already registered") return res.status(409).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await customerService.getProfile(userId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await customerService.updateProfile(userId, req.body);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listMyOrders(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { status, page, limit } = req.query as Record<string, string>;
            const result = await customerService.listMyOrders(userId, {
                status, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined,
            });
            return res.json({ success: true, data: result.data, meta: result.meta });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};