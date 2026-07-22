import { AadhaarProvider, AadhaarOtpSession, AadhaarDetails } from "./aadhar.interface";

const BASE_URL = "https://kyc-api.surepass.io/api/v1";

// need confirm with surepass team if the endpoints are correct, as they have not provided any documentation for aadhaar v2 endpoints
const GENERATE_OTP_ENDPOINT = `${BASE_URL}/aadhaar-v2/generate-otp`;
const SUBMIT_OTP_ENDPOINT = `${BASE_URL}/aadhaar-v2/submit-otp`;

export class SurepassAadhaarInstance implements AadhaarProvider {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    async generateOtp(aadhaarNumber: string): Promise<AadhaarOtpSession> {
        const res = await fetch(GENERATE_OTP_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ id_number: aadhaarNumber }),
        });

        if (!res.ok)
            throw new Error("Aadhaar OTP request failed invalid Aadhaar or service error");

        const data = (await res.json()) as any;
        const result = data.data;

        if (!result?.client_id)
            throw new Error("Aadhaar OTP request failed invalid Aadhaar or service error");

        return { clientId: result.client_id, raw: result };
    }

    async submitOtp(clientId: string, otp: string): Promise<AadhaarDetails> {
        const res = await fetch(SUBMIT_OTP_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ client_id: clientId, otp }),
        });

        if (!res.ok)
            throw new Error("Aadhaar OTP verification failed invalid OTP or expired session");

        const data = (await res.json()) as any;
        const result = data.data;

        if (!result)
            throw new Error("Aadhaar OTP verification failed incorrect OTP or expired session");

        return {
            aadhaarNumberMasked: result.aadhaar_number ?? "",
            fullName: result.full_name ?? "",
            dob: result.dob,
            gender: result.gender,
            address: result.address
                ? [result.address.house, result.address.street, result.address.dist,
                result.address.state, result.address.pincode].filter(Boolean).join(", ")
                : undefined,
            raw: result,
        };
    }
}