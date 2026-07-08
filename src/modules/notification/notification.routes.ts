import { Router } from "express";
import { notificationController } from "./notification.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
  markAsReadSchema,
  getNotificationsSchema,
} from "./notification.schema";

const router = Router();

router.get("/stream", protect, notificationController.stream);

router.get(
  "/",
  protect,
  publicLimiter,
  validate(getNotificationsSchema),
  notificationController.getNotifications,
);

router.patch(
  "/read",
  protect,
  publicLimiter,
  validate(markAsReadSchema),
  notificationController.markAsRead,
);

router.patch(
  "/read-all",
  protect,
  publicLimiter,
  notificationController.markAllAsRead,
);

export default router;
