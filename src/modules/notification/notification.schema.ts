import { z } from "zod";

export const markAsReadSchema = z.object({
    body: z.object({
        ids: z.array(z.string()).min(1).max(100),
    }),
});

export const getNotificationsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, "Invalid page").optional(),
        limit: z.string().regex(/^\d+$/, "Invalid limit").optional(),
    }),
});