import { Request, Response } from "express";
import { addressService } from "./address.service";
import { logger } from "../../utils/logger";

export const addressController = {
    async createAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await addressService.createAddress(userId, req.body);
            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Create address failed");
            if (error.message.includes("could not be determined from the provided pincode")) {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async updateAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { addressId } = req.params;
            const result = await addressService.updateAddress(userId, addressId as string, req.body);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Update address failed");
            if (error.message === "Address not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async deleteAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { addressId } = req.params;
            const result = await addressService.deleteAddress(userId, addressId as string);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error({ err: error.message }, "Delete address failed");
            if (error.message === "Address not found") return res.status(404).json({ success: false, error: error.message });
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },

    async listAddresses(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await addressService.listAddresses(userId);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    },
};