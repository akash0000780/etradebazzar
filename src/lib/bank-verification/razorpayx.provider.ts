import { RazorpayXInstance } from "../payouts/razorpayx.provider";
import { BankVerificationProvider, BankAccountVerificationInput, BankAccountVerificationResult } from "./bank-verification.interface";
import { computeNameMatchScore, NAME_MATCH_THRESHOLD } from "./name-match";

const VERIFICATION_AMOUNT_PAISE = 100; // ₹1 penny-drop

export class RazorpayXBankVerificationInstance implements BankVerificationProvider {
    private razorpayx: RazorpayXInstance;

    constructor(keyId: string, keySecret: string, sourceAccountNumber: string) {
        this.razorpayx = new RazorpayXInstance(keyId, keySecret, sourceAccountNumber);
    }

    async verifyBankAccount(input: BankAccountVerificationInput): Promise<BankAccountVerificationResult> {
        const fundAccount = await this.razorpayx.createFundAccount({
            accountHolderName: input.accountHolderName,
            accountNumber: input.accountNumber,
            ifscCode: input.ifscCode,
            bankName: "",
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
        });

        let validation;
        try {
            validation = await this.razorpayx.validateFundAccount(fundAccount.fundAccountId, VERIFICATION_AMOUNT_PAISE);
        } catch (error: any) {
            await this.razorpayx.deactivateFundAccount(fundAccount.fundAccountId).catch(() => null);
            return {
                outcome: "FAILED",
                accountStatus: null,
                verifiedAccountHolderName: null,
                nameMatchScore: null,
                fundAccountId: null,
                failureReason: error.message ?? "Bank account validation failed",
                raw: { fundAccountId: fundAccount.fundAccountId },
            };
        }

        if (validation.status !== "completed" || validation.accountStatus !== "active") {
            await this.razorpayx.deactivateFundAccount(fundAccount.fundAccountId).catch(() => null);
            return {
                outcome: "FAILED",
                accountStatus: validation.accountStatus,
                verifiedAccountHolderName: validation.registeredName,
                nameMatchScore: null,
                fundAccountId: null,
                failureReason: validation.status !== "completed"
                    ? "Bank account validation did not complete in time"
                    : "Bank account is inactive or does not exist",
                raw: validation.raw,
            };
        }

        const registeredName = validation.registeredName ?? "";
        const score = computeNameMatchScore(input.accountHolderName, registeredName);

        return {
            outcome: score >= NAME_MATCH_THRESHOLD ? "VERIFIED" : "NAME_MISMATCH",
            accountStatus: "active",
            verifiedAccountHolderName: registeredName,
            nameMatchScore: score,
            fundAccountId: fundAccount.fundAccountId,
            failureReason: null,
            raw: validation.raw,
        };
    }

    async deactivateFundAccount(fundAccountId: string): Promise<void> {
        await this.razorpayx.deactivateFundAccount(fundAccountId);
    }
}
