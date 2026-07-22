import { z } from "zod";

export const submitAadhaarSchema = z.object({
    body: z.object({ aadhaarNumber: z.string().length(12).regex(/^\d{12}$/, "Aadhaar number must be 12 digits") }),
});

export const submitAadhaarOtpSchema = z.object({
    body: z.object({ otp: z.string().min(4).max(8) }),
});

export const submitGovtIdSchema = z.object({
    body: z.object({
        govtIdType: z.enum(["PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE"]),
        govtIdNumber: z.string().min(4).max(30),
    }),
});

export const rejectVerificationSchema = z.object({
    params: z.object({ sellerId: z.string() }),
    body: z.object({ reason: z.string().min(5) }),
});

export const sellerParamSchema = z.object({
    params: z.object({ sellerId: z.string() }),
}); 