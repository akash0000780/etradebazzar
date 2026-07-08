import { z } from "zod";

export const verifyGstSchema = z.object({
    body: z.object({
        gstin: z.string().length(15),
    }),
});