import { StorageFactory } from "../../lib/storage/storage.factory";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
};
const MAX_SIZE = 10 * 1024 * 1024;

function assertSafeFile(file: Express.Multer.File): string {
    const ext = ALLOWED_TYPES[file.mimetype];
    if (!ext) {
        throw new Error(
            `Invalid file type. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`
        );
    }
    if (file.size > MAX_SIZE) {
        throw new Error(`File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
    }
    return ext;
}

export const uploadAssetService = {
    async uploadAsset(userId: string, file: Express.Multer.File) {
        const ext = assertSafeFile(file);
        const safeKey = `shop-assets/${userId}/${Date.now()}-${randomUUID()}${ext}`;
        
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