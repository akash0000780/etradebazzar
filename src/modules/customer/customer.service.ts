import { db } from "../../db/index";
import bcrypt from "bcryptjs";
import { creditEngine } from "../../lib/credit-engine/credit-rules";
export const customerService = {
    async register(data: { name: string; email: string; password: string; phone?: string }) {
        const existing = await db.user.findUnique({ where: { email: data.email } });
        if (existing) throw new Error("Email already registered");

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const user = db.user.create({
            data: { name: data.name, email: data.email, password: hashedPassword },
            select: { id: true, name: true, email: true, isActive: true, createdAt: true },
        });

        creditEngine.awardOnboardingBonus((await user).id).catch(() => null);

        return user;
    },

    async getProfile(userId: string) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
        });
        if (!user) throw new Error("User not found");
        return user;
    },

    async updateProfile(userId: string, data: { name?: string }) {
        const updated = db.user.update({ where: { id: userId }, data });
        creditEngine.checkProfileCompletion(userId).catch(() => null);
        return updated;
    },

    async listMyOrders(
        userId: string,
        filters: { status?: string; page?: number; limit?: number }
    ) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        const where: any = { customerId: userId };
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            db.order.findMany({
                where,
                include: {
                    items: { include: { product: { select: { id: true, name: true, images: { take: 1, orderBy: { order: "asc" } } } } } },
                    seller: { select: { id: true, businessName: true } },
                    shipments: { select: { status: true, trackingId: true, trackingUrl: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.order.count({ where }),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
    },
};