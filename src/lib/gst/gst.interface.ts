export interface GstDetails {
    gstin: string;
    legalName: string;
    tradeName: string;
    status: string;
    address: string;
    registrationDate: string;
    businessType: string;
    raw: any;
}

export interface GstProvider {
    verifyGst(gstin: string): Promise<GstDetails>;
}