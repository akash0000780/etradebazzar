import { AadhaarProvider, AadhaarOtpSession, AadhaarDetails } from "./aadhar.interface";

/** Deterministic fake provider for local/dev/test. OTP is always "111111". */
export class SandboxAadhaarInstance implements AadhaarProvider {
    constructor(
        private apiKey: string,
        private apiSecret: string,
    ) { }

    async generateOtp(aadhaarNumber: string): Promise<AadhaarOtpSession> {
        if (!/^\d{12}$/.test(aadhaarNumber)) {
            throw new Error("Aadhaar OTP request failed - invalid Aadhaar or service error");
        }
        return {
            clientId: `sandbox_${aadhaarNumber.slice(-4)}_${Date.now()}`,
            raw: { sandbox: true, apiKey: this.apiKey ? "set" : "unset" },
        };
    }

    async submitOtp(clientId: string, otp: string): Promise<AadhaarDetails> {
        if (otp !== "111111") {
            throw new Error("Aadhaar OTP verification failed incorrect OTP or expired session");
        }
        return {
            aadhaarNumberMasked: `XXXXXXXX${clientId.split("_")[1] ?? "0000"}`,
            fullName: "SANDBOX TEST USER",
            dob: "1990-01-01",
            gender: "M",
            address: "Sandbox Address, Test City, Test State, 000000",
            raw: { sandbox: true, clientId },
        };
    }
}