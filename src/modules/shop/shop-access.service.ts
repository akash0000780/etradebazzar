import { db } from "../../db/index";

const UNRESTRICTED_ROLES = ["owner", "manager"];

export const shopAccessService = {
    async setShopAccess(sellerId: string, actorId: string, memberId: string, shopIds: string[]) {
        const member = await db.sellerMember.findFirst({ where: { id: memberId, sellerId }, include: { role: true } });
        if (!member) throw new Error("Member not found");
        if (UNRESTRICTED_ROLES.includes(member.role.name)) {
            throw new Error("Owner/manager roles already have access to all shops");
        }

        if (shopIds.length) {
            const validShops = await db.shop.count({ where: { id: { in: shopIds }, sellerId } });
            if (validShops !== shopIds.length) throw new Error("One or more shops not found");
        }

        return db.$transaction(async (tx) => {
            await tx.shopAccess.deleteMany({ where: { memberId } });
            if (shopIds.length) {
                await tx.shopAccess.createMany({
                    data: shopIds.map((shopId) => ({ memberId, shopId })),
                });
            }

            await tx.auditLog.create({
                data: {
                    sellerId, actorId, actorType: "seller", action: "SHOP_ACCESS_UPDATED",
                    entityType: "seller_member", entityId: memberId, metadata: { shopIds },
                },
            });

            return tx.shopAccess.findMany({ where: { memberId }, include: { shop: { select: { id: true, name: true } } } });
        });
    },

    async getMemberShopAccess(sellerId: string, memberId: string) {
        const member = await db.sellerMember.findFirst({ where: { id: memberId, sellerId }, include: { role: true } });
        if (!member) throw new Error("Member not found");

        if (UNRESTRICTED_ROLES.includes(member.role.name)) {
            const allShops = await db.shop.findMany({ where: { sellerId }, select: { id: true, name: true } });
            return { unrestricted: true, shops: allShops };
        }

        const access = await db.shopAccess.findMany({
            where: { memberId },
            include: { shop: { select: { id: true, name: true } } },
        });
        return { unrestricted: false, shops: access.map((a) => a.shop) };
    },

    async getAccessibleShopIds(sellerId: string, userId: string): Promise<string[] | null> {
        const member = await db.sellerMember.findFirst({
            where: { sellerId, userId, isActive: true },
            include: { role: true },
        });
        if (!member) return [];
        if (UNRESTRICTED_ROLES.includes(member.role.name)) return null;

        const access = await db.shopAccess.findMany({ where: { memberId: member.id }, select: { shopId: true } });
        return access.map((a) => a.shopId);
    },

    async assertShopAccess(sellerId: string, userId: string, shopId: string): Promise<void> {
        const accessible = await this.getAccessibleShopIds(sellerId, userId);
        if (accessible === null) return;
        if (!accessible.includes(shopId)) throw new Error("You do not have access to this shop");
    },
};