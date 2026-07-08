import { Router } from "express";
import { categoryController } from "./category.controller";
import { protect } from "../../middleware/auth";
import { setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamSchema,
  listCategoriesSchema,
} from "./category.schema";

const router = Router();

// sellers + customers
router.get(
  "/",
  publicLimiter,
  validate(listCategoriesSchema),
  categoryController.listCategories,
);

router.get("/tree", categoryController.getCategoryTree);

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
  setPlatformAdmin,
  sellerLimiter,
  requirePlatformRole("super_admin"),
  validate(createCategorySchema),
  categoryController.createCategory,
);

router.patch(
  "/:categoryId",
  protect,
  setPlatformAdmin,
  sellerLimiter,
  requirePlatformRole("super_admin"),
  validate(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete(
  "/:categoryId",
  protect,
  setPlatformAdmin,
  sellerLimiter,
  requirePlatformRole("super_admin"),
  validate(categoryParamSchema),
  categoryController.deleteCategory,
);

export default router;
