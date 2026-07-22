-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT', 'USER_SEGMENT');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'HIGH_TICKET', 'SAMPLE', 'BULK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'NEGOTIATING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PENDING_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'FINAL');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('UPI', 'IMPS', 'RTGS', 'NEFT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED');

-- CreateEnum
CREATE TYPE "BulkUploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PICKED_UP', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SELLER_APPROVED', 'SELLER_REJECTED', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'ORDER_PLACED', 'ORDER_CONFIRMED', 'SHIPMENT_UPDATED', 'PAYMENT_RECEIVED', 'KYC_VERIFIED', 'KYC_REJECTED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'PAYOUT_INITIATED', 'PAYOUT_PAID', 'PAYOUT_FAILED', 'PRODUCT_LOW_STOCK', 'REVIEW_REPLY', 'COUPON_APPLIED', 'TEAM_INVITE');

-- CreateEnum
CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TopupMethod" AS ENUM ('NEFT', 'RTGS', 'IMPS', 'UPI');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alternatePhone" TEXT,
    "profileImage" TEXT,
    "businessLogo" TEXT,
    "businessDescription" TEXT,
    "industryCategory" TEXT,
    "yearOfEstablishment" INTEGER,
    "pickupAddress" JSONB,
    "billingAddress" JSONB,
    "socialLinks" JSONB,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_bank_details" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_kyc" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "aadharNumber" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "gstNumber" TEXT,
    "businessRegNumber" TEXT,
    "documents" TEXT[],
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "aadhaarStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "aadhaarRejectedReason" TEXT,
    "aadhaarVerifiedAt" TIMESTAMP(3),
    "govtIdType" TEXT,
    "govtIdNumber" TEXT,
    "govtIdStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "govtIdRejectedReason" TEXT,
    "govtIdVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_roles" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sellerId" TEXT,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "logo" TEXT,
    "banner" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "returnPolicy" TEXT,
    "pickupStreet" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupState" TEXT NOT NULL,
    "pickupPincode" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "reliabilityScore" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "shopId" TEXT,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "compareAtPrice" DECIMAL(10,2),
    "sku" TEXT,
    "stock" INTEGER,
    "lowStockThreshold" INTEGER,
    "weightGrams" INTEGER,
    "length" DECIMAL(8,2),
    "width" DECIMAL(8,2),
    "height" DECIMAL(8,2),
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_option_values" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_skus" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "options" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_thresholds" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productCategory" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_commissions" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "category" TEXT,
    "rate" DECIMAL(5,2) NOT NULL,
    "setBy" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "sellerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "finalAmount" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "commissionAmount" DECIMAL(10,2),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "assignedShopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discountAmount" DECIMAL(10,2),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "finalUnitPrice" DECIMAL(10,2),
    "selectedOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_negotiations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "proposedByType" TEXT NOT NULL,
    "proposedPrice" DECIMAL(10,2) NOT NULL,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'PENDING',
    "meetLink" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_uploads" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "BulkUploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalAddresses" INTEGER NOT NULL DEFAULT 0,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "assignedShopId" TEXT,
    "assignedBy" TEXT,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "orderId" TEXT NOT NULL,
    "orderAddressId" TEXT,
    "shopId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SHIPROCKET',
    "trackingId" TEXT,
    "trackingUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_shipments" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SHIPROCKET',
    "trackingId" TEXT,
    "trackingUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "refundId" TEXT,
    "refundAmount" DECIMAL(10,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payouts" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "razorpayPayoutId" TEXT,
    "fundAccountId" TEXT,
    "utrReference" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "initiatedBy" TEXT NOT NULL,
    "note" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_orders" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAmount" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "mediaUrls" TEXT[],
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "minOrder" DECIMAL(10,2),
    "maxUses" INTEGER,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "scopeType" "CouponScope" NOT NULL DEFAULT 'ALL',
    "scopeIds" TEXT[],
    "firstTimeOnly" BOOLEAN NOT NULL DEFAULT false,
    "userSegment" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isBulk" BOOLEAN NOT NULL DEFAULT false,
    "bulkGroupId" TEXT,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxnType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_topups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "TopupMethod" NOT NULL,
    "utrReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_topups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "style" TEXT,
    "thumbnailUrl" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "canvasState" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintArea" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "widthCm" DECIMAL(6,2) NOT NULL,
    "heightCm" DECIMAL(6,2) NOT NULL,
    "safetyMarginCm" DECIMAL(6,2) NOT NULL DEFAULT 0.5,
    "bleedMarginCm" DECIMAL(6,2) NOT NULL DEFAULT 0.3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_access" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "receiverName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_upload_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_upload_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_roles_name_key" ON "platform_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platform_members_userId_key" ON "platform_members"("userId");

-- CreateIndex
CREATE INDEX "platform_members_roleId_idx" ON "platform_members"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_configs_key_key" ON "platform_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_email_key" ON "sellers"("email");

-- CreateIndex
CREATE INDEX "sellers_status_idx" ON "sellers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "seller_bank_details_sellerId_key" ON "seller_bank_details"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_kyc_sellerId_key" ON "seller_kyc"("sellerId");

-- CreateIndex
CREATE INDEX "seller_roles_sellerId_idx" ON "seller_roles"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_roles_sellerId_name_key" ON "seller_roles"("sellerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "seller_members_sellerId_idx" ON "seller_members"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_members_userId_sellerId_key" ON "seller_members"("userId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_invites_token_key" ON "seller_invites"("token");

-- CreateIndex
CREATE INDEX "seller_invites_token_idx" ON "seller_invites"("token");

-- CreateIndex
CREATE INDEX "seller_invites_email_idx" ON "seller_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shops_displayId_key" ON "shops"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_sellerId_status_idx" ON "shops"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_displayId_key" ON "products"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_sellerId_status_idx" ON "products"("sellerId", "status");

-- CreateIndex
CREATE INDEX "products_shopId_idx" ON "products"("shopId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "variant_options_productId_idx" ON "variant_options"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_options_productId_name_key" ON "variant_options"("productId", "name");

-- CreateIndex
CREATE INDEX "variant_option_values_optionId_idx" ON "variant_option_values"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_option_values_optionId_value_key" ON "variant_option_values"("optionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "product_skus_sku_key" ON "product_skus"("sku");

-- CreateIndex
CREATE INDEX "product_skus_productId_idx" ON "product_skus"("productId");

-- CreateIndex
CREATE INDEX "audit_logs_sellerId_createdAt_idx" ON "audit_logs"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "order_thresholds_sellerId_idx" ON "order_thresholds"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "order_thresholds_sellerId_productCategory_key" ON "order_thresholds"("sellerId", "productCategory");

-- CreateIndex
CREATE INDEX "product_commissions_productId_idx" ON "product_commissions"("productId");

-- CreateIndex
CREATE INDEX "product_commissions_category_idx" ON "product_commissions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "orders_displayId_key" ON "orders"("displayId");

-- CreateIndex
CREATE INDEX "orders_sellerId_status_idx" ON "orders"("sellerId", "status");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_negotiations_orderId_idx" ON "order_negotiations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_uploads_orderId_key" ON "bulk_uploads"("orderId");

-- CreateIndex
CREATE INDEX "order_addresses_orderId_idx" ON "order_addresses"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_displayId_key" ON "shipments"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderAddressId_key" ON "shipments"("orderAddressId");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");

-- CreateIndex
CREATE INDEX "return_requests_customerId_idx" ON "return_requests"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "return_shipments_returnRequestId_key" ON "return_shipments"("returnRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_razorpayPayoutId_key" ON "seller_payouts"("razorpayPayoutId");

-- CreateIndex
CREATE INDEX "seller_payouts_sellerId_idx" ON "seller_payouts"("sellerId");

-- CreateIndex
CREATE INDEX "seller_payouts_status_idx" ON "seller_payouts"("status");

-- CreateIndex
CREATE INDEX "payout_orders_payoutId_idx" ON "payout_orders"("payoutId");

-- CreateIndex
CREATE INDEX "payout_orders_orderId_idx" ON "payout_orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_orders_payoutId_orderId_key" ON "payout_orders"("payoutId", "orderId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_sellerId_idx" ON "reviews"("sellerId");

-- CreateIndex
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_productId_customerId_key" ON "reviews"("orderId", "productId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_reviewId_userId_key" ON "review_helpful"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_expiresAt_idx" ON "coupons"("expiresAt");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_orderId_key" ON "coupon_usages"("orderId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_userId_idx" ON "coupon_usages"("userId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_revoked_idx" ON "sessions"("revoked");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_topups_userId_idx" ON "wallet_topups"("userId");

-- CreateIndex
CREATE INDEX "templates_productId_idx" ON "templates"("productId");

-- CreateIndex
CREATE INDEX "templates_sellerId_idx" ON "templates"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintArea_productId_key" ON "PrintArea"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_sellerId_idx" ON "team_invites"("sellerId");

-- CreateIndex
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "shop_access_memberId_idx" ON "shop_access"("memberId");

-- CreateIndex
CREATE INDEX "shop_access_shopId_idx" ON "shop_access"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_access_memberId_shopId_key" ON "shop_access"("memberId", "shopId");

-- CreateIndex
CREATE INDEX "customer_addresses_userId_idx" ON "customer_addresses"("userId");

-- CreateIndex
CREATE INDEX "customer_upload_assets_userId_idx" ON "customer_upload_assets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_skuId_key" ON "cart_items"("cartId", "productId", "skuId");

-- AddForeignKey
ALTER TABLE "platform_members" ADD CONSTRAINT "platform_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_members" ADD CONSTRAINT "platform_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_bank_details" ADD CONSTRAINT "seller_bank_details_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_kyc" ADD CONSTRAINT "seller_kyc_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_roles" ADD CONSTRAINT "seller_roles_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "seller_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_members" ADD CONSTRAINT "seller_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "seller_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_invites" ADD CONSTRAINT "seller_invites_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "variant_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_thresholds" ADD CONSTRAINT "order_thresholds_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_commissions" ADD CONSTRAINT "product_commissions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedShopId_fkey" FOREIGN KEY ("assignedShopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "product_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_negotiations" ADD CONSTRAINT "order_negotiations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_uploads" ADD CONSTRAINT "bulk_uploads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_assignedShopId_fkey" FOREIGN KEY ("assignedShopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderAddressId_fkey" FOREIGN KEY ("orderAddressId") REFERENCES "order_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_shipments" ADD CONSTRAINT "return_shipments_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_orders" ADD CONSTRAINT "payout_orders_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "seller_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_orders" ADD CONSTRAINT "payout_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_topups" ADD CONSTRAINT "wallet_topups_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "seller_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_access" ADD CONSTRAINT "shop_access_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "seller_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_access" ADD CONSTRAINT "shop_access_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_upload_assets" ADD CONSTRAINT "customer_upload_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "product_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
