import { db } from "../../db/index";
import { creditEngine } from "../../lib/credit-engine/credit-rules";

export const addressService = {
    async createAddress(
        userId: string,
        data: {
            label?: string; receiverName: string; phone: string; street: string;
            city: string; state: string; pincode: string; latitude?: number; longitude?: number; isDefault?: boolean;
        }
    ) {
        if (data.isDefault) {
            await db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
        }

        const count = await db.customerAddress.count({ where: { userId } });

        const address = db.customerAddress.create({
            data: { ...data, userId, isDefault: data.isDefault ?? count === 0 }, // first address auto-default
        });

        creditEngine.checkProfileCompletion(userId).catch(() => null);

        return address;
    },

    async updateAddress(
        userId: string,
        addressId: string,
        data: Partial<{
            label: string; receiverName: string; phone: string; street: string;
            city: string; state: string; pincode: string; latitude: number; longitude: number; isDefault: boolean;
        }>
    ) {
        const address = await db.customerAddress.findFirst({ where: { id: addressId, userId } });
        if (!address) throw new Error("Address not found");

        if (data.isDefault) {
            await db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
        }

        return db.customerAddress.update({ where: { id: addressId }, data });
    },

    async deleteAddress(userId: string, addressId: string) {
        const address = await db.customerAddress.findFirst({ where: { id: addressId, userId } });
        if (!address) throw new Error("Address not found");

        await db.customerAddress.delete({ where: { id: addressId } });

        if (address.isDefault) {
            const next = await db.customerAddress.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
            if (next) await db.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
        }

        return { deleted: true };
    },

    async listAddresses(userId: string) {
        return db.customerAddress.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });
    },

    async getDefaultAddress(userId: string) {
        return db.customerAddress.findFirst({ where: { userId, isDefault: true } });
    },
};