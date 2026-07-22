import { Request, Response } from "express";
import { verificationService } from "./verification.service";
import { logger } from "../../utils/logger";

const clientErrors = [
    "Aadhaar number must be 12 digits",
    "KYC record not found!complete KYC first",
    "KYC record not found",
    "Aadhaar already verified, contact support to change it",
    "Government ID already verified, contact support to change it",
    "PAN number format is invalid",
    "No pending Aadhaar OTP request - request an OTP first",
    "Aadhaar OTP request failed - invalid Aadhaar or service error",
    "Aadhaar OTP verification failed - incorrect OTP or expired session",
];

export const verificationController = {
    async requestAadhaarOtp(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { aadhaarNumber } = req.body;
            const result = await verificationService.requestAadhaarOtp(sellerId, aadhaarNumber);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Request aadhaar OTP failed");
            if (clientErrors.includes(error.message)) return res.status(400).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async confirmAadhaarOtp(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { otp } = req.body;
            const result = await verificationService.confirmAadhaarOtp(sellerId, otp);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Confirm aadhaar OTP failed");
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
            if (error.message === "KYC record not found") {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.startsWith("Cannot verify")) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async rejectAadhaar(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const actorId = req.user!.id;
            const { reason } = req.body;
            const result = await verificationService.rejectAadhaar(sellerId as string, actorId, reason);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Reject aadhaar failed");
            if (error.message === "KYC record not found") {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.startsWith("Cannot reject")) {
                return res.status(400).json({ success: false, error: error.message });
            }
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
            if (error.message === "KYC record not found") {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.startsWith("Cannot verify")) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async rejectGovernmentId(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const actorId = req.user!.id;
            const { reason } = req.body;
            const result = await verificationService.rejectGovernmentId(sellerId as string, actorId, reason);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Reject govt id failed");
            if (error.message === "KYC record not found") {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.startsWith("Cannot reject")) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};