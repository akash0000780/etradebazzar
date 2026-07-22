import { Router } from "express";
import { categoryController } from "./category.controller";
import { categoryAttributeController } from "./category-attribute.controller";
import { protect } from "../../middleware/auth";
import { requirePlatformAdmin } from "../../middleware/tenant";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamSchema,
  listCategoriesSchema,
} from "./category.schema";
import {
  createCategoryAttributeSchema,
  updateCategoryAttributeSchema,
  categoryAttributeParamSchema,
  listCategoryAttributesSchema,
} from "./category-attribute.schema";

const router = Router();

// sellers + customers
router.get(
  "/",
  publicLimiter,
  validate(listCategoriesSchema),
  categoryController.listCategories,
);

router.get("/tree", publicLimiter, categoryController.getCategoryTree);

router.get(
  "/:categoryId",
  publicLimiter,
  validate(categoryParamSchema),
  categoryController.getCategory,
);

// Platform admin only  manage categories
router.post(
  "/",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(createCategorySchema),
  categoryController.createCategory,
);

router.patch(
  "/:categoryId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete(
  "/:categoryId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(categoryParamSchema),
  categoryController.deleteCategory,
);

router.get(
  "/:categoryId/attributes",
  publicLimiter,
  validate(listCategoryAttributesSchema),
  categoryAttributeController.listAttributes,
);

router.post(
  "/:categoryId/attributes",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(createCategoryAttributeSchema),
  categoryAttributeController.createAttribute,
);

router.patch(
  "/:categoryId/attributes/:attributeId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(updateCategoryAttributeSchema),
  categoryAttributeController.updateAttribute,
);

router.delete(
  "/:categoryId/attributes/:attributeId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin"),
  validate(categoryAttributeParamSchema),
  categoryAttributeController.deleteAttribute,
);

export default router;
