import { Request, Response } from "express";
import { storefrontService } from "./storefront.service";
import { logger } from "../../utils/logger";

export const storefrontController = {
    async getShop(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const result = await storefrontService.getShopBySlug(slug as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            if (error.message === "Shop not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listShopProducts(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const { search, categoryId, page, limit } = req.query as Record<string, string>;
            const result = await storefrontService.listShopProducts(slug as string, {
                search, categoryId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined,
            });
            return res.json({ success: true, data: result.data, meta: result.meta });
        } catch (error: any) {
            if (error.message === "Shop not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getProduct(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const result = await storefrontService.getPublicProduct(productId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            if (error.message === "Product not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};