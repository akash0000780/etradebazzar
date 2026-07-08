import { Request, Response } from "express";
import { productSearchService } from "./product-search.service";
import { logger } from "../../utils/logger";

export const productSearchController = {
    async searchProducts(req: Request, res: Response) {
        try {
            const {
                q,
                categoryId,
                minPrice,
                maxPrice,
                sellerId,
                shopId,
                status,
                page,
                limit,
            } = req.query as Record<string, string>;

            const result = await productSearchService.searchProducts({
                q,
                categoryId,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                sellerId,
                shopId,
                status,
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
            });

            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Product search failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};