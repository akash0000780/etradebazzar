import { Router } from "express";
import { customerController } from "./customer.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { publicLimiter, sellerLimiter } from "../../middleware/rate-limit";
import { registerCustomerSchema, updateProfileSchema, listMyOrdersSchema } from "./customer.schema";

const router = Router();

router.post("/register", publicLimiter, validate(registerCustomerSchema), customerController.register);
router.get("/profile", protect, sellerLimiter, customerController.getProfile);
router.put("/profile", protect, sellerLimiter, validate(updateProfileSchema), customerController.updateProfile);
router.get("/orders", protect, sellerLimiter, validate(listMyOrdersSchema), customerController.listMyOrders);

export default router;