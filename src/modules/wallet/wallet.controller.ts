import { Request, Response } from "express";
import { walletService } from "./wallet.service";
import { logger } from "../../utils/logger";

const clientErrors = [
    "Credit amount must be positive",
    "Debit amount must be positive",
    "Top-up amount must be positive",
    "Wallet not found",
    "Insufficient credits",
    "This top-up has already been processed",
];

export const walletController = {
    async getBalance(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await walletService.getBalance(userId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get balance failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async topup(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await walletService.topup(userId, req.body);
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Wallet top-up failed");
            if (clientErrors.includes(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getTransactions(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { page, limit } = req.query as Record<string, string>;
            const result = await walletService.getTransactions(
                userId,
                page ? Number(page) : undefined,
                limit ? Number(limit) : undefined
            );
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get transactions failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getTopupHistory(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await walletService.getTopupHistory(userId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get top-up history failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};