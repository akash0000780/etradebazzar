import { Router } from "express";
import { storefrontController } from "./storefront.controller";
import { publicLimiter } from "../../middleware/rate-limit";

const router = Router();

router.get("/shops/:slug", publicLimiter, storefrontController.getShop);
router.get("/shops/:slug/products", publicLimiter, storefrontController.listShopProducts);
router.get("/products/:productId", publicLimiter, storefrontController.getProduct);

export default router;