import { Request, Response } from "express";
import { shopAccessService } from "./shop-access.service";
import { logger } from "../../utils/logger";

const clientErrors = [
    "Member not found", "Owner/manager roles already have access to all shops",
    "One or more shops not found",
];

export const shopAccessController = {
    async setShopAccess(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const actorId = req.user!.id;
            const { memberId } = req.params;
            const { shopIds } = req.body;
            const result = await shopAccessService.setShopAccess(sellerId, actorId, memberId as string, shopIds);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Set shop access failed");
            if (clientErrors.includes(error.message)) return res.status(400).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getMemberShopAccess(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { memberId } = req.params;
            const result = await shopAccessService.getMemberShopAccess(sellerId, memberId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get member shop access failed");
            if (error.message === "Member not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};