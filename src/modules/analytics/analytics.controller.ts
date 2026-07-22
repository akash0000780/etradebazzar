import { Request, Response } from "express";
import { analyticsService } from "./analytics.service";
import { logger } from "../../utils/logger";
import type { ViewName } from "../../lib/analytics/analytics.registry";

const MAX_LIMIT = 100;
const getLimit = (req: Request): number => Math.min(Number(req.query["limit"]) || 10, MAX_LIMIT);

export const analyticsController = {
    // Seller
    async getSellerAnalytics(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { period, from, to } = req.query as Record<string, string>;
            const result = await analyticsService.getSellerAnalytics(
                sellerId,
                period as any,
                from,
                to
            );
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get seller analytics failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getSellerDailyRevenue(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { period, from, to } = req.query as Record<string, string>;
            const result = await analyticsService.getSellerDailyRevenue(
                sellerId,
                period as any,
                from,
                to
            );
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get seller daily revenue failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getSellerTopProducts(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const limit = getLimit(req);
            const result = await analyticsService.getSellerTopProducts(sellerId, limit);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get seller top products failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getSellerReturnRate(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const result = await analyticsService.getSellerReturnRate(sellerId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get seller return rate failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    // Platform Admin
    async getPlatformAnalytics(req: Request, res: Response) {
        try {
            const { period, from, to } = req.query as Record<string, string>;
            const result = await analyticsService.getPlatformAnalytics(
                period as any,
                from,
                to
            );
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get platform analytics failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getTopSellers(req: Request, res: Response) {
        try {
            const limit = getLimit(req);
            const result = await analyticsService.getTopSellers(limit);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get top sellers failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async refreshView(req: Request, res: Response) {
        try {
            const { viewName } = req.params;
            const result = await analyticsService.refreshView(viewName as ViewName);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Refresh view failed");
            if (error.message.startsWith("Unknown view")) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async refreshAllViews(req: Request, res: Response) {
        try {
            const result = await analyticsService.refreshAllViews();
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Refresh all views failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};