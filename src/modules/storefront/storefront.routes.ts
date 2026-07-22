import { Router } from "express";
import { storefrontController } from "./storefront.controller";
import { publicLimiter } from "../../middleware/rate-limit";
import { validate } from "../../utils/validate";
import {
    shopSlugParamSchema,
    listShopProductsSchema,
    storefrontProductParamSchema,
} from "./storefront.schema";

const router = Router();

router.get("/shops/:slug", publicLimiter, validate(shopSlugParamSchema), storefrontController.getShop);
router.get("/shops/:slug/products", publicLimiter, validate(listShopProductsSchema), storefrontController.listShopProducts);
router.get("/products/:productId", publicLimiter, validate(storefrontProductParamSchema), storefrontController.getProduct);

export default router;