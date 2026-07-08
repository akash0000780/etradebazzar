import crypto from 'crypto';
import { CreateFundAccountInput, CreatePayoutInput, FundAccount, PayoutProvider, PayoutResult, WebhookResult } from './payout.interface';

const BASE_URL = "https://api.razorpay.com/v1";

const STATUS_MAP: Record<string, PayoutResult["status"]> = {
    pending: "pending",
    processing: "processing",
    processed: "processed",
    failed: "failed",
    queued: "queued",
    cancelled: "cancelled",
};

export class RazorpayXInstance implements PayoutProvider {
    private keyId: string;
    private keySecret: string;

    constructor(keyId: string, keySecret: string) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    private get authHeader(): string {
        const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
        return `Basic ${token}`;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        accountNumber?: string
    ): Promise<T> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: this.authHeader,
        };

        //X-Razorpay-Account header payout APIs
        if (accountNumber) {
            headers["X-Razorpay-Account"] = accountNumber;
        }

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        if (!res.ok) {
            const error = await res.json() as any;
            throw new Error(`RazorpayX error: ${error?.error?.description ?? res.statusText}`);
        }

        return res.json() as Promise<T>;
    }

    async createFundAccount(input: CreateFundAccountInput): Promise<FundAccount> {
        const contact = await this.request<any>("/contacts", {
            method: "POST",
            body: JSON.stringify({
                name: input.contactName,
                email: input.contactEmail,
                contact: input.contactPhone,
                type: "vendor",
            }),
        });

        const fundAccount = await this.request<any>("/fund_accounts", {
            method: "POST",
            body: JSON.stringify({
                contact_id: contact.id,
                account_type: "bank_account",
                bank_account: {
                    name: input.accountHolderName,
                    ifsc: input.ifscCode,
                    account_number: input.accountNumber,
                },
            }),
        });

        return {
            fundAccountId: fundAccount.id,
            raw: fundAccount,
        };
    }

    async createPayout(input: CreatePayoutInput): Promise<PayoutResult> {
        const payout = await this.request<any>("/payouts", {
            method: "POST",
            body: JSON.stringify({
                account_number: input.fundAccountId,
                fund_account_id: input.fundAccountId,
                amount: Math.round(input.amount * 100), // paise
                currency: input.currency,
                mode: input.mode,
                purpose: "payout",
                reference_id: input.refId,
                narration: input.narration ?? "Seller payout",
                queue_if_low_balance: true,
            }),
        });

        return {
            razorpayPayoutId: payout.id,
            status: STATUS_MAP[payout.status] ?? "pending",
            utrRef: payout.utr ?? null,
            raw: payout,
        };
    }

    async getPayout(razorpayPayoutId: string): Promise<PayoutResult> {
        const payout = await this.request<any>(`/payouts/${razorpayPayoutId}`);

        return {
            razorpayPayoutId: payout.id,
            status: STATUS_MAP[payout.status] ?? "pending",
            utrRef: payout.utr ?? null,
            raw: payout,
        };
    }

    async handleWebhook(payload: any, signature: string, webhookSecret: string): Promise<WebhookResult> {
        const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(JSON.stringify(payload))
            .digest("hex");

        if (expected !== signature) {
            throw new Error("Invalid webhook signature");
        }

        const event = payload.event as string;
        const entity = payload.payload?.payout?.entity;

        if (!entity) throw new Error("Invalid webhook payload");

        const statusMap: Record<string, WebhookResult["status"]> = {
            "payout.processed": "processed",
            "payout.failed": "failed",
            "payout.queued": "queued",
            "payout.cancelled": "cancelled",
        };

        return {
            razorpayPayoutId: entity.id,
            status: statusMap[event] ?? "failed",
            utrRef: entity.utr ?? null,
            failureReason: entity.error?.description ?? null,
            raw: payload,
        };
    }
}