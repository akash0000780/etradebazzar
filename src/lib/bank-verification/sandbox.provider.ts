import { BankVerificationProvider, BankAccountVerificationInput, BankAccountVerificationResult } from "./bank-verification.interface";
import { computeNameMatchScore, NAME_MATCH_THRESHOLD } from "./name-match";

/**
 * Deterministic fake provider for local/dev/test - never contacts a real bank or spends real money.
 * Account numbers ending in "0000" simulate a non-existent/inactive account (FAILED).
 * Account numbers ending in "9999" simulate a real account with a mismatched registered name (NAME_MISMATCH).
 * Any other account number simulates a clean match (VERIFIED).
 */
export class SandboxBankVerificationInstance implements BankVerificationProvider {
    constructor(
        private apiKey: string,
        private apiSecret: string,
    ) { }

    async verifyBankAccount(input: BankAccountVerificationInput): Promise<BankAccountVerificationResult> {
        if (input.accountNumber.endsWith("0000")) {
            return {
                outcome: "FAILED",
                accountStatus: "inactive",
                verifiedAccountHolderName: null,
                nameMatchScore: null,
                fundAccountId: null,
                failureReason: "Account does not exist or is inactive (sandbox)",
                raw: { sandbox: true, apiKey: this.apiKey ? "set" : "unset" },
            };
        }

        const fundAccountId = `sandbox_fa_${input.accountNumber.slice(-6)}_${Date.now()}`;
        const registeredName = input.accountNumber.endsWith("9999")
            ? "SANDBOX MISMATCHED NAME"
            : input.accountHolderName;

        const score = computeNameMatchScore(input.accountHolderName, registeredName);

        return {
            outcome: score >= NAME_MATCH_THRESHOLD ? "VERIFIED" : "NAME_MISMATCH",
            accountStatus: "active",
            verifiedAccountHolderName: registeredName,
            nameMatchScore: score,
            fundAccountId,
            failureReason: null,
            raw: { sandbox: true, fundAccountId },
        };
    }

    async deactivateFundAccount(_fundAccountId: string): Promise<void> {
        // sandbox no-op - nothing real to deactivate
    }
}
