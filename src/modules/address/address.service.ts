import { db } from "../../db/index";
import { creditEngine } from "../../lib/credit-engine/credit-rules";
import { PincodeFactory } from "../../lib/location/pincode.factory";
import { logger } from "../../utils/logger";

export const addressService = {
    async createAddress(
        userId: string,
        data: {
            label?: string; receiverName: string; phone: string; street: string;
            city?: string; state?: string; pincode: string; latitude?: number; longitude?: number; isDefault?: boolean;
        }
    ) {
        let city = data.city;
        let state = data.state;

        if ((!city || !state) && data.pincode) {
            try {
                const pincodeProvider = PincodeFactory.get();
                const pincodeDetails = await pincodeProvider.lookupByPincode(data.pincode);

                if (!city) city = pincodeDetails.city;
                if (!state) state = pincodeDetails.state;
            } catch (error: any) {
                logger.warn({ err: error.message, pincode: data.pincode }, "Failed to auto-fill city/state from pincode");
            }
        }

        if (!city || !state) {
            throw new Error("City and state could not be determined from the provided pincode. Please provide them manually.");
        }

        if (data.isDefault) {
            await db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
        }

        const count = await db.customerAddress.count({ where: { userId } });

        const address = await db.customerAddress.create({
            data: { ...data, city, state, userId, isDefault: data.isDefault ?? count === 0 }, // first address auto-default
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

        let city = data.city ?? address.city;
        let state = data.state ?? address.state;

        if (data.pincode && data.pincode !== address.pincode && (!city || !state)) {
            try {
                const pincodeProvider = PincodeFactory.get();
                const pincodeDetails = await pincodeProvider.lookupByPincode(data.pincode);

                if (!city) city = pincodeDetails.city;
                if (!state) state = pincodeDetails.state;
            } catch (error: any) {
                logger.warn({ err: error.message, pincode: data.pincode }, "Failed to auto-fill city/state from pincode");
            }
        }

        if (data.isDefault) {
            await db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
        }

        return db.customerAddress.update({ where: { id: addressId }, data: { ...data, city, state } });
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