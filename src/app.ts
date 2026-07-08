import express from "express";
import { Request, Response, NextFunction, Application } from "express";

import { logger } from "./utils/logger";

import { security } from "./middleware/security";

import authRoutes from "./routes/auth.routes";
import { protect } from "./middleware/auth";
import sellerRoutes from "./modules/seller/seller.routes";
import shopRoutes from "./modules/shop/shop.routes";
import productRoutes from "./modules/product/product.routes";
import platformRoutes from "./modules/platform/platform.routes";
import orderRoutes from "./modules/order/order.routes";
import shipmentRoutes from "./modules/shipment/shipment.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import categoryRoutes from "./modules/category/category.routes";
import returnRoutes from "./modules/return/return.routes";
import payoutRoutes from "./modules/payout/payout.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import reviewsRoutes from "./modules/review/review.routes";
import couponRoutes from "./modules/coupon/coupon.routes";
import sellerProfileRoutes from "./modules/seller/seller-profile.routes";
import securityRoutes from "./modules/security/security.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import gstRoutes from "./modules/gst/gst.routes";
import templateRoutes from "./modules/template/template.routes";
import printAreaRoutes from "./modules/print-area/print-area.routes";
import userRoutes from "./modules/user/user.routes";
import customerRoutes from "./modules/customer/customer.routes";
import cartRoutes from "./modules/cart/cart.routes";
import notificationRoutes from "./modules/notification/notification.routes";
const app: Application = express();

app.use(...security);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  });

  logger.info({ ip: req.ip }, "Health check");
});

app.use("/api/auth", authRoutes);

app.get("/api/me", protect, (req: Request, res: Response) => {
  res.json({
    message: "Welcome to protected area",
    user: req.user,
  });
});
app.use("/api/sellers", sellerRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/seller-profile", sellerProfileRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/print-areas", printAreaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((err: any, req: Request, res: Response, _: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: (req as any).user?.id,
      status,
    },
    "Unhandled exception",
  );

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
});

export default app;
