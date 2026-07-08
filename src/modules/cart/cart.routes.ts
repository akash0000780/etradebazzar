import { Router } from "express";
import { cartController } from "./cart.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { addCartItemSchema, updateCartItemSchema, cartItemParamSchema, checkoutSchema } from "./cart.schema";

const router = Router();

router.get("/", protect, sellerLimiter, cartController.getCart);
router.post("/items", protect, sellerLimiter, validate(addCartItemSchema), cartController.addItem);
router.patch("/items/:itemId", protect, sellerLimiter, validate(updateCartItemSchema), cartController.updateItem);
router.delete("/items/:itemId", protect, sellerLimiter, validate(cartItemParamSchema), cartController.removeItem);
router.delete("/", protect, sellerLimiter, cartController.clearCart);
router.post("/checkout", protect, sellerLimiter, validate(checkoutSchema), cartController.checkout);

export default router;