import { Request, Response } from "express";
import { gstService } from "./gst.service";
import { logger } from "../../utils/logger";

function isClientError(msg: string): boolean {
    return (
        msg === "Invalid GSTIN format" ||
        msg.includes("cannot proceed") ||
        msg === "KYC record not found complete KYC before verifying GST"
    );
}

export const gstController = {
    async verifyGst(req: Request, res: Response) {
        try {
            const { gstin } = req.body;
            const result = await gstService.verifyGst(gstin);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Verify GST failed");
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
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
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};