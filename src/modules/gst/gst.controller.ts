import { Request, Response } from "express";
import { gstService } from "./gst.service";
import { logger } from "../../utils/logger";

export const gstController = {
    async verifyGst(req: Request, res: Response) {
        try {
            const { gstin } = req.body;
            const result = await gstService.verifyGst(gstin);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Verify GST failed");
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    async verifyAndAutofill(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { gstin } = req.body;
            const result = await gstService.verifyAndAutofill(sellerId, gstin);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Verify and autofill GST failed");
            return res.status(400).json({ success: false, error: error.message });
        }
    },
};