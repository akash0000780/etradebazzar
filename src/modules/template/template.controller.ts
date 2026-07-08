import { Request, Response } from "express";
import { templateService } from "./template.service";
import { logger } from "../../utils/logger";

const clientErrors = ["Product not found", "Template not found"];

export const templateController = {
    async createTemplate(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const thumbnailFile = req.file as Express.Multer.File;
            if (!thumbnailFile) return res.status(400).json({ success: false, error: "Thumbnail file required" });

            const canvasState = typeof req.body.canvasState === "string"
                ? JSON.parse(req.body.canvasState)
                : req.body.canvasState;

            const result = await templateService.createTemplate(
                sellerId,
                { ...req.body, canvasState },
                thumbnailFile
            );
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Create template failed");
            if (clientErrors.includes(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async updateTemplate(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { templateId } = req.params;
            const result = await templateService.updateTemplate(sellerId, templateId as string, req.body);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Update template failed");
            if (clientErrors.includes(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async deleteTemplate(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const { templateId } = req.params;
            await templateService.deleteTemplate(sellerId, templateId as string);
            return res.json({ success: true, data: { deleted: true } });
        } catch (error: any) {
            logger.error({ err: error.message }, "Delete template failed");
            if (clientErrors.includes(error.message)) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listTemplatesForProduct(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const result = await templateService.listTemplatesForProduct(productId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "List templates failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listSellerTemplates(req: Request, res: Response) {
        try {
            const sellerId = req.seller!.id;
            const result = await templateService.listSellerTemplates(sellerId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "List seller templates failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async getTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            const result = await templateService.getTemplate(templateId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Get template failed");
            if (error.message === "Template not found") {
                return res.status(404).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};