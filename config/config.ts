import dotenv from "dotenv";
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;

  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtSecret?: string;

  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  allowedOrigins?: string[];

  encryptionKey: string;

  shiprocketBaseUrl: string;
  shiprocketEmail: string;
  shiprocketPassword: string;
  shiprocketWebhookSecret: string;
  
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;

  resendApiToken: string;
  companyEmail: string;

  msg91BaseUrl: string;
  msg91AuthKey: string;
  msg91SenderId: string;
  msg91OtpTemplateId: string;
  msg91OrderPlacedTemplateId: string;
  msg91ShipmentTemplateId: string;

  appUrl: string;

  // AWS S3
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsS3Bucket: string;
  awsCdnUrl: string;

  // DigitalOcean Spaces
  doSpacesRegion: string;
  doSpacesKey: string;
  doSpacesSecret: string;
  doSpacesBucket: string;
  doSpacesCdnUrl: string;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,

  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,

  jwtPrivateKey: (process.env.JWT_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  jwtPublicKey: (process.env.JWT_PUBLIC_KEY || "").replace(/\\n/g, "\n"),
  jwtIssuer: process.env.JWT_ISSUER || "https://yourdomain.com",
  jwtAudience: process.env.JWT_AUDIENCE || "https://yourdomain.com",
  jwtSecret: process.env.JWT_SECRET,

  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",

  allowedOrigins:
    process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) || ["*"],

  encryptionKey: process.env.ENCRYPTION_KEY!,

  shiprocketBaseUrl: "https://apiv2.shiprocket.in/v1/external",
  shiprocketEmail: process.env.SHIPROCKET_EMAIL!,
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD!,
  shiprocketWebhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET!,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET!,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,

  resendApiToken: process.env.RESEND_API_TOKEN!,
  companyEmail: process.env.COMPANY_EMAIL!,

  msg91BaseUrl: "https://api.msg91.com/api/v5",
  msg91AuthKey: process.env.MSG91_AUTH_KEY!,
  msg91SenderId: process.env.MSG91_SENDER_ID!,
  msg91OtpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID!,
  msg91OrderPlacedTemplateId:
    process.env.MSG91_ORDER_PLACED_TEMPLATE_ID!,
  msg91ShipmentTemplateId:
    process.env.MSG91_SHIPMENT_TEMPLATE_ID!,

  appUrl: process.env.APP_URL!,

  // AWS S3
  awsRegion: process.env.AWS_REGION!,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  awsS3Bucket: process.env.AWS_S3_BUCKET!,
  awsCdnUrl: process.env.AWS_CDN_URL || "",

  // DigitalOcean Spaces
  doSpacesRegion: process.env.DO_SPACES_REGION!,
  doSpacesKey: process.env.DO_SPACES_KEY!,
  doSpacesSecret: process.env.DO_SPACES_SECRET!,
  doSpacesBucket: process.env.DO_SPACES_BUCKET!,
  doSpacesCdnUrl: process.env.DO_SPACES_CDN_URL || "",
} as const satisfies Config;