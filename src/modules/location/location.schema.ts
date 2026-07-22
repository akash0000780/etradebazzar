import { z } from "zod";

export const pincodeParamSchema = z.object({
    params: z.object({
        pincode: z.string().regex(/^\d{6}$/, "Invalid pincode. Must be 6 digits."),
    }),
});
