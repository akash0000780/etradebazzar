import { z } from "zod";

export const markAsReadSchema = z.object({
    body: z.object({
        ids: z.array(z.string()).min(1),
    }),
});

export const getNotificationsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
    }),
});