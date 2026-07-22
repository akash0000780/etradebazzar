import { config } from "../../../../config/config";
import {
    SmsProvider,
    SendSmsInput,
    SmsResult,
    SendOtpInput,
    OtpResult,
    VerifyOtpInput,
} from "./sms.interface";

const BASE_URL = "https://api.msg91.com/api/v5";

export class Msg91Instance implements SmsProvider {
    private authKey: string;
    private senderId: string;

    constructor() {
        this.authKey = config.msg91AuthKey;
        this.senderId = config.msg91SenderId;
    }

    private async request<T>(endpoint: string, body: Record<string, any>): Promise<T> {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                authkey: this.authKey,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json() as any;
        if (data.type === "error") throw new Error(`MSG91 error: ${data.message}`);
        return data as T;
    }

    async send(input: SendSmsInput): Promise<SmsResult> {
        const phone = input.to.replace(/^\+/, "");

        const data = await this.request<{ request_id: string }>("/flow/", {
            template_id: input.templateId,
            sender: this.senderId,
            short_url: "0",
            mobiles: phone,
            VAR1: input.variables?.VAR1,
            VAR2: input.variables?.VAR2,
            VAR3: input.variables?.VAR3,
        });

        return { messageId: data.request_id, to: input.to };
    }

    async sendOtp(input: SendOtpInput): Promise<OtpResult> {
        const phone = input.to.replace(/^\+/, "");

        const data = await this.request<{ request_id: string }>("/otp", {
            template_id: input.templateId ?? config.msg91OtpTemplateId,
            mobile: phone,
            authkey: this.authKey,
            expiry: input.expiry ?? 10,
            ...(input.otp && { otp: input.otp }),
        });

        return { requestId: data.request_id, to: input.to };
    }

    async verifyOtp(input: VerifyOtpInput): Promise<boolean> {
        const phone = input.to.replace(/^\+/, "");

        try {
            const params = new URLSearchParams({ mobile: phone, otp: input.otp });
            const res = await fetch(
                `${BASE_URL}/otp/verify?${params}`, {
                method: "GET",
                headers: { authkey: this.authKey },
            });
            const data = await res.json() as any;
            return data.type === "success";
        } catch {
            return false;
        }
    }
}