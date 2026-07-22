import { Request, Response } from "express";
import { productBulkService } from "./product-bulk.service";
import { logger } from "../../utils/logger";

export const productBulkController = {
    async uploadProducts(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const actorId = req.user!.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ success: false, error: "XLS file required" });
            }

            const result = await productBulkService.uploadProducts(sellerId, actorId, file);

            return res.status(201).json({
                success: true,
                data: {
                    created: result.created,
                    failed: result.failed,
                    total: result.results.length,
                    results: result.results,
                },
            });
        } catch (error: any) {
            logger.error({ err: error.message }, "Bulk product upload failed");
            const clientErrors = [
                "XLS file is empty",
                "KYC not submitted",
                "KYC not verified",
                "Missing columns",
                "Bulk upload exceeds",
            ];
            if (clientErrors.some((e) => error.message.startsWith(e))) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async downloadTemplate(req: Request, res: Response) {
        try {
            const buffer = await productBulkService.getTemplate();
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=product-upload-template.xlsx");
            return res.send(buffer);
        } catch (error: any) {
            logger.error({ err: error.message }, "Download template failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};