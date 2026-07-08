export interface SendSmsInput {
    to: string;
    message?: string;
    templateId?: string;
    variables?: Record<string, string>;
    type: "OTP" | "TRANSACTIONAL";
}

export interface SendOtpInput {
    to: string;
    otp?: string;
    templateId?: string;
    expiry?: number;
}

export interface SmsResult {
    messageId: string;
    to: string;
}

export interface OtpResult {
    requestId: string;
    to: string;
}

export interface VerifyOtpInput {
    to: string;
    otp: string;
    requestId?: string;
}

export interface SmsProvider {
    send(input: SendSmsInput): Promise<SmsResult>;
    sendOtp(input: SendOtpInput): Promise<OtpResult>;
    verifyOtp(input: VerifyOtpInput): Promise<boolean>;
}