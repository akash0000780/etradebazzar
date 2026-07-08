import { Request, Response } from "express";
import { reviewService } from "./review.service";
import { logger } from "../../utils/logger";

const clientErrors = [
    "Order not found",
    "Review not found",
    "Can only review delivered orders",
    "Product was not in this order",
    "You have already reviewed this product for this order",
    "Rating must be between 1 and 5",
    "Can only reply to approved reviews",
    "Already replied to this review",
    "Review already moderated",
    "Review not available",
    "Cannot mark your own review as helpful",
];

function isClientError(msg: string): boolean {
    return clientErrors.includes(msg);
}

export const reviewController = {
    async createReview(req: Request, res: Response) {
        try {
            const customerId = req.user!.id;
            const mediaFiles = req.files as Express.Multer.File[] | undefined;
            const result = await reviewService.createReview(customerId, {
                ...req.body,
                mediaFiles,
            });
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Create review failed");
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async replyToReview(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { reviewId } = req.params;
            const { reply } = req.body;
            const result = await reviewService.replyToReview(sellerId, reviewId as string, reply);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Reply to review failed");
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async moderateReview(req: Request, res: Response) {
        try {
            const { reviewId } = req.params;
            const { action } = req.body;
            const actorId = req.user!.id;
            const result = await reviewService.moderateReview(reviewId as string, actorId, action);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Moderate review failed");
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async markHelpful(req: Request, res: Response) {
        try {
            const { reviewId } = req.params;
            const userId = req.user!.id;
            const result = await reviewService.markHelpful(reviewId as string, userId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Mark helpful failed");
            if (isClientError(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getProductReviews(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const { page, limit, rating } = req.query as Record<string, string>;
            const result = await reviewService.getProductReviews(
                productId as string,
                page ? Number(page) : undefined,
                limit ? Number(limit) : undefined,
                rating ? Number(rating) : undefined
            );
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get product reviews failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listPendingReviews(req: Request, res: Response) {
        try {
            const result = await reviewService.listPendingReviews();
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "List pending reviews failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getSellerReviews(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { status } = req.query as Record<string, string>;
            const result = await reviewService.getSellerReviews(sellerId, status);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get seller reviews failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};