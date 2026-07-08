import { Request, Response } from "express";
import { verificationService } from "./verification.service";
import { logger } from "../../utils/logger";

const clientErrors = [
    "Aadhaar number must be 12 digits",
    "KYC record not found!complete KYC first",
    "KYC record not found",
];

export const verificationController = {
    async submitAadhaar(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { aadhaarNumber } = req.body;
            const result = await verificationService.submitAadhaar(sellerId, aadhaarNumber);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Submit aadhaar failed");
            if (clientErrors.includes(error.message)) return res.status(400).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async submitGovernmentId(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const result = await verificationService.submitGovernmentId(sellerId, req.body);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Submit govt id failed");
            if (clientErrors.includes(error.message)) return res.status(400).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getStatus(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const result = await verificationService.getVerificationStatus(sellerId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get verification status failed");
            if (error.message === "KYC record not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async verifyAadhaar(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const actorId = req.user!.id;
            const result = await verificationService.verifyAadhaar(sellerId as string, actorId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Verify aadhaar failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async rejectAadhaar(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const { reason } = req.body;
            const result = await verificationService.rejectAadhaar(sellerId as string, reason);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Reject aadhaar failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async verifyGovernmentId(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const actorId = req.user!.id;
            const result = await verificationService.verifyGovernmentId(sellerId as string, actorId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Verify govt id failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async rejectGovernmentId(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const { reason } = req.body;
            const result = await verificationService.rejectGovernmentId(sellerId as string, reason);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Reject govt id failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};