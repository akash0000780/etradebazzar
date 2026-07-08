import Razorpay from "razorpay";
import crypto from "crypto"

import { config } from "../../../config/config";

import { CreateOrderInput, GatewayOrder, GatewayRefund, PaymentGateway, RefundInput, VerifyInput, WebhookResult } from "./gateway.interface";

export class RazorpayInstance implements PaymentGateway {
    private client: Razorpay;

    constructor() {
        this.client = new Razorpay({
            key_id: config.razorpayKeyId,
            key_secret: config.razorpayKeySecret,
        });
    }

    async createOrder(data: CreateOrderInput): Promise<GatewayOrder> {
        const order = await this.client.orders.create({
            amount: Math.round(data.amount * 100), //convert to paise
            currency: data.currency,
            receipt: data.receipt,
            notes: data.notes
        })

        return {
            gatewayOrderId: order.id,
            amount: data.amount,
            currency: data.currency,
            receipt: data.receipt,
            raw: order,
        };
    }
    async verifyPayment(data: VerifyInput): Promise<boolean> {
        const body = `${data.gatewayOrderId}|${data.gatewayPaymentId}`;
        const expected = crypto
            .createHmac("sha256", config.razorpayKeySecret)
            .update(body)
            .digest("hex");
        return expected === data.signature;
    }

    async initiateRefund(data: RefundInput): Promise<GatewayRefund> {
        const refund = await this.client.payments.refund(data.gatewayPaymentId, {
            amount: Math.round(data.amount * 100),
            notes: data.notes,
        });

        return {
            refundId: refund.id,
            amount: data.amount,
            raw: refund,
        };
    }
    async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
        const expected = crypto
            .createHmac("sha256", config.razorpayWebhookSecret)
            .update(JSON.stringify(payload))
            .digest("hex");

        if (expected !== signature) {
            throw new Error("Invalid webhook signature");
        }

        const event = payload.event as string;
        const paymentEntity = payload.payload?.payment?.entity;
        const refundEntity = payload.payload?.refund?.entity;

        switch (event) {
            case "payment.captured":
                return {
                    event,
                    gatewayOrderId: paymentEntity?.order_id,
                    gatewayPaymentId: paymentEntity?.id,
                    amount: paymentEntity?.amount / 100,
                    status: "captured",
                };

            case "payment.failed":
                return {
                    event,
                    gatewayOrderId: paymentEntity?.order_id,
                    gatewayPaymentId: paymentEntity?.id,
                    status: "failed",
                };

            case "refund.processed":
                return {
                    event,
                    gatewayPaymentId: refundEntity?.payment_id,
                    refundId: refundEntity?.id,
                    amount: refundEntity?.amount / 100,
                    status: "refunded",
                };

            default:
                return { event, status: "unknown" };
        }
    }
}

