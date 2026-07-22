export interface BankAccountVerificationInput {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
}

export type BankAccountStatus = "active" | "inactive";

export interface BankAccountVerificationResult {
    outcome: "VERIFIED" | "NAME_MISMATCH" | "FAILED";
    accountStatus: BankAccountStatus | null;
    verifiedAccountHolderName: string | null;
    nameMatchScore: number | null;
    fundAccountId: string | null;
    failureReason: string | null;
    raw: unknown;
}

export interface BankVerificationProvider {
    verifyBankAccount(input: BankAccountVerificationInput): Promise<BankAccountVerificationResult>;
    deactivateFundAccount(fundAccountId: string): Promise<void>;
}
