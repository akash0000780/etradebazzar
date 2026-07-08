import { z } from "zod";

export const verifyTwoFactorSchema = z.object({
    body: z.object({ token: z.string().length(6) }),
});

export const sessionParamSchema = z.object({
    params: z.object({ sessionId: z.string() }),
});