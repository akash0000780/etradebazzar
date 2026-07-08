import { z } from "zod";

export const setShopAccessSchema = z.object({
    params: z.object({ memberId: z.string() }),
    body: z.object({ shopIds: z.array(z.string()) }),
});

export const memberParamSchema = z.object({
    params: z.object({ memberId: z.string() }),
});