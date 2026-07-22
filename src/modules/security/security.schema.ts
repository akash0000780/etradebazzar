import { z } from "zod";

export const setupTwoFactorSchema = z.object({
    body: z.object({ currentToken: z.string().length(6).optional() }),
});

export const verifyTwoFactorSchema = z.object({
    body: z.object({ token: z.string().length(6) }),
});

export const sessionParamSchema = z.object({
    params: z.object({ sessionId: z.string() }),
});