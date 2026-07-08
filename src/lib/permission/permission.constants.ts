export const PERMISSIONS = {
    PRODUCTS_CREATE: "products.create",
    PRODUCTS_UPDATE: "products.update",
    PRODUCTS_DELETE: "products.delete",
    PRODUCTS_VIEW: "products.view",
    PRODUCTS_BULK: "products.bulk",
    PRODUCTS_EXPORT: "products.export",
    PRODUCTS_IMAGES: "products.images.manage",
    PRODUCTS_VARIANTS: "products.variants.manage",
    SELLER_KYC: "seller.kyc.manage",
    SELLER_BANK: "seller.bank.manage",
    SELLER_MEMBERS_VIEW: "seller.members.view",
    SELLER_MEMBERS_MANAGE: "seller.members.manage",
    SELLER_ROLES_MANAGE: "seller.roles.manage",
    SELLER_INVITES_MANAGE: "seller.invites.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];