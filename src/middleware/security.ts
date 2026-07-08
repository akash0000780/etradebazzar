import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { config } from "../../config/config";

const allowedOrigins = config.allowedOrigins;

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      allowedOrigins[0] === "*"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.ip === "::1" || req.ip === "127.0.0.1",
  message: { error: "Too many requests  please try again later" },
  keyGenerator: (req) => req.ip || "unknown",
});

const helmetMiddleware = helmet({
  contentSecurityPolicy:
    process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  originAgentCluster: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: true,
});
export const security = [helmetMiddleware, corsMiddleware, limiter];
