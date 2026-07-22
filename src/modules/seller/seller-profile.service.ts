import { db } from "../../db/index";

function fmt(n: any): number {
    return n ? parseFloat(Number(n).toFixed(2)) : 0.00;
}

export const sellerProfileService = {
    async getProfile(sellerId: string) {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: {
                id: true, name: true, email: true, phone: true, alternatePhone: true,
                profileImage: true, createdAt: true, updatedAt: true, status: true,
            },
        });
        if (!seller) throw new Error("Seller not found");
        return seller;
    },

    async updateProfile(
        sellerId: string,
        data: Partial<{ name: string; alternatePhone: string; profileImage: string }>
    ) {
        return db.seller.update({ where: { id: sellerId }, data });
    },

    async getBusiness(sellerId: string) {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: {
                businessName: true, businessType: true, businessLogo: true,
                businessDescription: true, industryCategory: true, yearOfEstablishment: true,
                street: true, city: true, state: true, pincode: true,
                pickupAddress: true, billingAddress: true, socialLinks: true,
                kyc: { select: { panNumber: true, gstNumber: true, status: true } },
            },
        });
        if (!seller) throw new Error("Seller not found");
        return seller;
    },

    async updateBusiness(
        sellerId: string,
        data: Partial<{
            businessName: string;
            businessLogo: string;
            businessDescription: string;
            industryCategory: string;
            yearOfEstablishment: number;
            pickupAddress: object;
            billingAddress: object;
            socialLinks: object;
        }>
    ) {
        return db.seller.update({ where: { id: sellerId }, data: data as any });
    },

    async getVerificationBadges(sellerId: string) {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: {
                status: true,
                kyc: {
                    select: {
                        status: true, aadhaarStatus: true, govtIdStatus: true,
                    },
                },
            },
        });
        if (!seller) throw new Error("Seller not found");
        return {
            approvalStatus: seller.status,
            kycStatus: seller.kyc?.status ?? "PENDING",
            aadhaarStatus: seller.kyc?.aadhaarStatus ?? "PENDING",
            governmentIdStatus: seller.kyc?.govtIdStatus ?? "PENDING",
        };
    },

    //Shop statistics 
    async getShopStats(sellerId: string, shopId: string) {
        const shop = await db.shop.findFirst({ where: { id: shopId, sellerId } });
        if (!shop) throw new Error("Shop not found");

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalAgg, monthAgg, reviewAgg] = await Promise.all([
            db.order.aggregate({
                where: { assignedShopId: shopId, status: "DELIVERED" },
                _sum: { finalAmount: true, totalAmount: true },
                _count: { id: true },
            }),
            db.order.aggregate({
                where: { assignedShopId: shopId, status: "DELIVERED", createdAt: { gte: monthStart } },
                _sum: { finalAmount: true, totalAmount: true },
                _count: { id: true },
            }),
            db.review.aggregate({
                where: { product: { shopId }, status: "APPROVED" },
                _avg: { rating: true },
            }),
        ]);

        return {
            totalRevenue: fmt(totalAgg._sum.finalAmount ?? totalAgg._sum.totalAmount),
            totalOrders: totalAgg._count.id ?? 0,
            averageRating: fmt(reviewAgg._avg.rating),
            responseRate: 0.00,
            monthlyRevenue: fmt(monthAgg._sum.finalAmount ?? monthAgg._sum.totalAmount),
            monthlyOrders: monthAgg._count.id ?? 0,
        };
    },
};