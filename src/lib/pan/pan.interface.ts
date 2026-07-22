export interface PanDetails {
    panNumber: string;
    fullName: string;
    /** "Individual" | "Company" | "HUF" | etc, as returned by the provider */
    category?: string;
    /** e.g. "VALID" / "INVALID" / "EXISTS_BUT_NOT_VALID" */
    status: string;
    aadhaarSeedingStatus?: string;
    raw: unknown;
}

export interface PanProvider {
    verifyPan(panNumber: string): Promise<PanDetails>;
}