import { Request, Response } from "express";
import { printAreaService } from "./print-area.service";
import { logger } from "../../utils/logger";

export const printAreaController = {
    async setPrintArea(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { productId } = req.params;
            const result = await printAreaService.setPrintArea(sellerId, productId as string, req.body);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Set print area failed");
            if (error.message === "Product not found") {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getPrintArea(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const result = await printAreaService.getPrintArea(productId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get print area failed");
            if (error.message === "Print area not configured for this product") {
                return res.status(404).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async deletePrintArea(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { productId } = req.params;
            const result = await printAreaService.deletePrintArea(sellerId, productId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Delete print area failed");
            if (error.message === "Product not found") {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};