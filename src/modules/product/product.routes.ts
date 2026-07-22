import { Router } from "express";
import multer from "multer";
import { productController } from "./product.controller";
import { productImageController } from "./product-image.controller";
import { productVariantController } from "./product-variant.controller";
import { productSearchController } from "./product-search.controller";
import { productBulkController } from "./product-bulk.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, requirePlatformAdmin } from "../../middleware/tenant";
import { requirePermission } from "../../middleware/permission";
import { PERMISSIONS } from "../../lib/permission/permission.constants";
import { validate } from "../../utils/validate";
import {
  sellerLimiter,
  uploadLimiter,
  publicLimiter,
} from "../../middleware/rate-limit";
import {
  createProductSchema,
  updateProductSchema,
  productParamSchema,
  reviewProductSchema,
  rejectProductSchema,
  listProductsSchema,
  bulkProductActionSchema,
} from "./product.schema";
import {
  productImageParamSchema,
  deleteImageSchema,
  reorderImagesSchema,
} from "./product-image.schema";
import {
  createVariantSchema,
  addVariantValuesSchema,
  variantParamSchema,
  variantValueParamSchema,
  createSKUSchema,
  updateSKUSchema,
  skuParamSchema,
} from "./product-variant.schema";
import { searchProductsSchema } from "./product-search.schema";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get(
  "/search",
  publicLimiter,
  validate(searchProductsSchema),
  productSearchController.searchProducts,
);
router.get(
  "/bulk/template",
  publicLimiter,
  productBulkController.downloadTemplate,
);
router.post(
  "/bulk",
  protect,
  uploadLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_BULK),
  upload.single("file"),
  productBulkController.uploadProducts,
);
router.get(
  "/pending",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "product_reviewer"),
  productController.listPendingProducts,
);
router.get(
  "/all",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "product_reviewer"),
  productController.listAllProducts,
);
router.get(
  "/details/:productId",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "product_reviewer"),
  validate(productParamSchema),
  productController.getProductById,
);

// Platform Admin
router.patch(
  "/:productId/approve",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "product_reviewer"),
  validate(reviewProductSchema),
  productController.approveProduct,
);
router.patch(
  "/:productId/reject",
  protect,
  sellerLimiter,
  requirePlatformAdmin("super_admin", "product_reviewer"),
  validate(rejectProductSchema),
  productController.rejectProduct,
);

// Public: Product detail (for customers)
router.get(
  "/:productId/detail",
  publicLimiter,
  validate(productParamSchema),
  productController.getProductById,
);

// Seller: Product CRUD
router.post(
  "/",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate(createProductSchema),
  productController.createProduct,
);
router.get(
  "/",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  validate(listProductsSchema),
  productController.listProducts,
);
router.get(
  "/:productId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  validate(productParamSchema),
  productController.getProduct,
);
router.patch(
  "/:productId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate(updateProductSchema),
  productController.updateProduct,
);
router.delete(
  "/:productId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  validate(productParamSchema),
  productController.deleteProduct,
);
router.post(
  "/bulk-action",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_BULK),
  validate(bulkProductActionSchema),
  productController.bulkAction,
);

router.get(
  "/export",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_EXPORT),
  productController.exportProductsCsv,
);

// Product Images
router.get(
  "/:productId/images",
  publicLimiter,
  validate(productImageParamSchema),
  productImageController.listImages,
);
router.post(
  "/:productId/images",
  protect,
  uploadLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_IMAGES),
  upload.single("image"),
  validate(productImageParamSchema),
  productImageController.uploadImage,
);
router.patch(
  "/:productId/images/reorder",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_IMAGES),
  validate(reorderImagesSchema),
  productImageController.reorderImages,
);
router.delete(
  "/:productId/images/:imageId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_IMAGES),
  validate(deleteImageSchema),
  productImageController.deleteImage,
);

// Product Variants
router.get(
  "/:productId/variants",
  publicLimiter,
  validate(productImageParamSchema),
  productVariantController.listVariants,
);
router.post(
  "/:productId/variants",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(createVariantSchema),
  productVariantController.createVariant,
);
router.post(
  "/:productId/variants/:optionId/values",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(addVariantValuesSchema),
  productVariantController.addVariantValues,
);
router.delete(
  "/:productId/variants/:optionId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(variantParamSchema),
  productVariantController.deleteVariant,
);
router.delete(
  "/:productId/variants/:optionId/values/:valueId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(variantValueParamSchema),
  productVariantController.deleteVariantValue,
);

// Product SKUs
router.get(
  "/:productId/skus",
  publicLimiter,
  validate(productImageParamSchema),
  productVariantController.listSKUs,
);
router.get(
  "/:productId/skus/:skuId",
  publicLimiter,
  validate(skuParamSchema),
  productVariantController.getSKU,
);
router.post(
  "/:productId/skus",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(createSKUSchema),
  productVariantController.createSKU,
);
router.patch(
  "/:productId/skus/:skuId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(updateSKUSchema),
  productVariantController.updateSKU,
);
router.delete(
  "/:productId/skus/:skuId",
  protect,
  sellerLimiter,
  resolveTenant,
  requirePermission(PERMISSIONS.PRODUCTS_VARIANTS),
  validate(skuParamSchema),
  productVariantController.deleteSKU,
);

export default router;
