import { z } from "zod";

export const topupSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
        method: z.enum(["NEFT", "RTGS", "UPI", "IMPS"]),
        utrReference: z.string().min(5).max(50),
    }),
});

export const listTransactionsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
    }),
});