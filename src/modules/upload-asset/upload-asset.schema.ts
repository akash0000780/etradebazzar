import { z } from "zod";

export const listRecentSchema = z.object({
    query: z.object({ limit: z.string().regex(/^\d+$/).optional() }),
});

export const assetParamSchema = z.object({
    params: z.object({ assetId: z.string() }),
});