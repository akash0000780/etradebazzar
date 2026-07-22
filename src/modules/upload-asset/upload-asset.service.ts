import { db } from "../../db/index";
import { StorageFactory } from "../../lib/storage/storage.factory";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
};

const ALLOWED_CATEGORIES = ["customer-uploads", "shop-assets", "kyc-documents"] as const;
type AssetCategory = (typeof ALLOWED_CATEGORIES)[number];

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const CATEGORY_MAX_SIZE: Record<AssetCategory, number> = {
    "customer-uploads": 10 * 1024 * 1024, // 10MB
    "shop-assets": 10 * 1024 * 1024, // 10MB
    "kyc-documents": 5 * 1024 * 1024, // 5MB
};

function assertSafeFile(file: Express.Multer.File, category: AssetCategory): string {
    const ext = ALLOWED_TYPES[file.mimetype];
    if (!ext) {
        throw new Error(
            `Invalid file type. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`
        );
    }
    const maxSize = CATEGORY_MAX_SIZE[category] ?? DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
        throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
    }
    return ext;
}

export const uploadAssetService = {
    async uploadAsset(userId: string, file: Express.Multer.File, category: AssetCategory = "customer-uploads") {
        if (!ALLOWED_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}`);
        }

        const ext = assertSafeFile(file, category);
        const safeKey = `${category}/${userId}/${Date.now()}-${randomUUID()}${ext}`;

        const storage = StorageFactory.get();
        const upload = await storage.upload({
            key: safeKey,
            buffer: file.buffer,
            mimeType: file.mimetype,
            size: file.size,
            contentDisposition: "attachment",
        });

        return db.customerUploadAsset.create({
            data: { userId, url: upload.url, key: upload.key, fileType: file.mimetype },
        });
    },

    async listRecent(userId: string, limit = 20) {
        const cappedLimit = Math.min(limit, 100);
        return db.customerUploadAsset.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: cappedLimit,
        });
    },

    async deleteAsset(userId: string, assetId: string) {
        const asset = await db.customerUploadAsset.findFirst({ where: { id: assetId, userId } });
        if (!asset) throw new Error("Asset not found");

        const storage = StorageFactory.get();
        await storage.delete({ key: asset.key }).catch(() => null);

        await db.customerUploadAsset.delete({ where: { id: assetId } });
        return { deleted: true };
    },
};