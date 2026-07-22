import { Request, Response } from "express";
import { PincodeFactory } from "../../lib/location/pincode.factory";
import { logger } from "../../utils/logger";

export const locationController = {
    async lookupPincode(req: Request, res: Response) {
        try {
            const { pincode } = req.params as { pincode: string };
            const provider = PincodeFactory.get();
            const details = await provider.lookupByPincode(pincode);
            return res.json({ success: true, data: details });
        } catch (error: any) {
            if (error.message?.includes("No data found")) {
                return res.status(404).json({ success: false, error: "No location found for the provided pincode" });
            }
            logger.warn({ err: error.message, pincode: req.params["pincode"] }, "Pincode lookup failed");
            return res.status(502).json({ success: false, error: "Pincode lookup service unavailable" });
        }
    },
};
