import { Request, Response } from "express";
import { uploadAssetService } from "./upload-asset.service";
import { logger } from "../../utils/logger";

export const uploadAssetController = {
    async uploadAsset(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const file = req.file as Express.Multer.File;
            if (!file) return res.status(400).json({ success: false, error: "File required" });
            const result = await uploadAssetService.uploadAsset(userId, file);
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Upload asset failed");
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};