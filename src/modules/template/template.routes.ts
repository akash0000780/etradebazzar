import { Router } from "express";
import multer from "multer";
import { templateController } from "./template.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { publicLimiter, sellerLimiter, uploadLimiter } from "../../middleware/rate-limit";
import {
    createTemplateSchema, updateTemplateSchema, templateParamSchema, productTemplatesParamSchema,
} from "./template.schema";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get("/product/:productId", publicLimiter, validate(productTemplatesParamSchema), templateController.listTemplatesForProduct);
router.get("/:templateId", publicLimiter, validate(templateParamSchema), templateController.getTemplate);

// Seller
router.post("/", protect, uploadLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    upload.single("thumbnail"), validate(createTemplateSchema), templateController.createTemplate);
router.get("/", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager", "staff"),
    templateController.listSellerTemplates);
router.patch("/:templateId", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    validate(updateTemplateSchema), templateController.updateTemplate);
router.delete("/:templateId", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    validate(templateParamSchema), templateController.deleteTemplate);

export default router;