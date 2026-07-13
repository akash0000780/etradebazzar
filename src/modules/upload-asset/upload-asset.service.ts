import { StorageFactory } from "../../lib/storage/storage.factory";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
};

const ALLOWED_CATEGORIES = ["shop-assets", "kyc-documents"] as const;
type AssetCategory = (typeof ALLOWED_CATEGORIES)[number];

// Per-category max file size. Falls back to DEFAULT_MAX_SIZE if a category
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const CATEGORY_MAX_SIZE: Record<AssetCategory, number> = {
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
    async uploadAsset(userId: string, file: Express.Multer.File, category: AssetCategory = "shop-assets") {
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

        return {
            id: randomUUID(),
            url: upload.url,
            key: upload.key,
            fileType: file.mimetype,
        };
    },
};