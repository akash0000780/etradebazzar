import { Router } from "express";
import multer from "multer";
import { uploadAssetController } from "./upload-asset.controller";
import { protect } from "../../middleware/auth";
import { uploadLimiter } from "../../middleware/rate-limit";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Invalid file type"));
        }
        cb(null, true);
    },
});

router.post("/", protect, uploadLimiter, upload.single("file"), uploadAssetController.uploadAsset);

export default router;