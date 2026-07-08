import { db } from "../../db/index";
import { PaymentFactory } from "../../lib/payments/payment.factory";
import { notificationService } from "../notification/notification.service";
import { logger } from "../../utils/logger";

function getAdvancePercent(orderType: string): number {
    return orderType === "HIGH_TICKET" ? 50 : 20;
}

async function notifyPaymentReceived(orderId: string, amount: number) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        select: { customerId: true },
    });
    if (!order) return;

    const customer = await db.user.findUnique({
        where: { id: order.customerId },
        select: { email: true, name: true },
    });
    if (!customer) return;

    notificationService.notify({
        userId: order.customerId,
        email: customer.email,
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        message: `Payment of ₹${amount.toFixed(2)} received for order #${orderId}`,
        channels: ["sse"],
        data: { orderId, amount },
    }).catch(() => null);
}
export const paymentService = {
    async createAdvancePayment(orderId: string) {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: { payments: true },
        });
        if (!order) throw new Error("Order not found");
        if (!["CONFIRMED", "NEGOTIATING"].includes(order.status)) {
            throw new Error("Order not in payable state");
        }

        const existingAdvance = order.payments.find((p) => p.type === "ADVANCE" && p.status !== "FAILED");
        if (existingAdvance) throw new Error("Advance payment already initiated");

        const baseAmount = Number(order.finalAmount ?? order.totalAmount);
        const percent = getAdvancePercent(order.type);
        const advanceAmount = parseFloat(((baseAmount * percent) / 100).toFixed(2));

        const gateway = PaymentFactory.get();
        const gatewayOrder = await gateway.createOrder({
            amount: advanceAmount,
            currency: "INR",
            receipt: `adv_${orderId}`,
            notes: { orderId, type: "ADVANCE", percent: String(percent) },
        });

        const payment = await db.payment.create({
            data: {
                orderId,
                razorpayOrderId: gatewayOrder.gatewayOrderId,
                amount: advanceAmount,
                type: "ADVANCE",
                status: "UNPAID",
                metadata: { percent, baseAmount },
            },
        });

        return { payment, gatewayOrder };
    },

    async createFinalPayment(orderId: string) {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: { payments: true },
        });
        if (!order) throw new Error("Order not found");

        const advancePaid = order.payments.find((p) => p.type === "ADVANCE" && p.status === "PAID");
        if (!advancePaid) throw new Error("Advance payment not completed");

        const existingFinal = order.payments.find((p) => p.type === "FINAL" && p.status !== "FAILED");
        if (existingFinal) throw new Error("Final payment already initiated");

        const baseAmount = Number(order.finalAmount ?? order.totalAmount);
        const finalAmount = parseFloat((baseAmount - Number(advancePaid.amount)).toFixed(2));

        const gateway = PaymentFactory.get();
        const gatewayOrder = await gateway.createOrder({
            amount: finalAmount,
            currency: "INR",
            receipt: `final_${orderId}`,
            notes: { orderId, type: "FINAL" },
        });

        const payment = await db.payment.create({
            data: {
                orderId,
                razorpayOrderId: gatewayOrder.gatewayOrderId,
                amount: finalAmount,
                type: "FINAL",
                status: "UNPAID",
                metadata: { baseAmount, advancePaid: Number(advancePaid.amount) },
            },
        });

        return { payment, gatewayOrder };
    },

    async verifyAndCapturePayment(data: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }) {
        const gateway = PaymentFactory.get();
        const isValid = await gateway.verifyPayment({
            gatewayOrderId: data.razorpayOrderId,
            gatewayPaymentId: data.razorpayPaymentId,
            signature: data.razorpaySignature,
        });
        if (!isValid) throw new Error("Invalid payment signature");

        const payment = await db.payment.findUnique({
            where: { razorpayOrderId: data.razorpayOrderId },
            include: { order: { include: { payments: true } } },
        });
        if (!payment) throw new Error("Payment record not found");

        const updated = await db.$transaction(async (tx) => {
            const result = await tx.payment.update({
                where: { id: payment.id },
                data: { razorpayPaymentId: data.razorpayPaymentId, status: "PAID" },
            });

            const totalPaid = payment.order.payments
                .filter((p) => p.id !== payment.id)
                .concat({ ...payment, status: "PAID" })
                .filter((p) => p.status === "PAID")
                .reduce((sum, p) => sum + Number(p.amount), 0);

            const baseAmount = Number(payment.order.finalAmount ?? payment.order.totalAmount);
            const isFullyPaid = Math.abs(totalPaid - baseAmount) < 0.01;

            await tx.order.update({
                where: { id: payment.orderId },
                data: { paymentStatus: isFullyPaid ? "PAID" : "PARTIALLY_PAID" },
            });

            await tx.auditLog.create({
                data: {
                    sellerId: payment.order.sellerId,
                    actorId: payment.orderId,
                    actorType: "system",
                    action: "PAYMENT_CAPTURED",
                    entityType: "payment",
                    entityId: payment.id,
                    metadata: { gatewayPaymentId: data.razorpayPaymentId, amount: Number(payment.amount), type: payment.type },
                },
            });

            return result;
        });

        await notifyPaymentReceived(payment.orderId, Number(payment.amount));

        return updated;
    },

    async handleWebhook(payload: any, signature: string) {
        const gateway = PaymentFactory.get();
        const result = await gateway.handleWebhook(payload, signature);

        logger.info({ event: result.event }, "Payment webhook received");

        switch (result.status) {
            case "captured": {
                if (!result.gatewayOrderId) break;
                const payment = await db.payment.findUnique({
                    where: { razorpayOrderId: result.gatewayOrderId },
                    include: { order: { include: { payments: true } } },
                });
                if (!payment || payment.status === "PAID") break;

                await db.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: { razorpayPaymentId: result.gatewayPaymentId, status: "PAID" },
                    });

                    const totalPaid = payment.order.payments
                        .filter((p) => p.id !== payment.id)
                        .concat({ ...payment, status: "PAID" })
                        .filter((p) => p.status === "PAID")
                        .reduce((sum, p) => sum + Number(p.amount), 0);

                    const baseAmount = Number(payment.order.finalAmount ?? payment.order.totalAmount);
                    const isFullyPaid = Math.abs(totalPaid - baseAmount) < 0.01;

                    await tx.order.update({
                        where: { id: payment.orderId },
                        data: { paymentStatus: isFullyPaid ? "PAID" : "PARTIALLY_PAID" },
                    });
                });

                await notifyPaymentReceived(payment.orderId, Number(payment.amount));
                break;
            }

            case "failed": {
                if (!result.gatewayOrderId) break;
                await db.payment.updateMany({
                    where: { razorpayOrderId: result.gatewayOrderId },
                    data: { status: "FAILED", attempts: { increment: 1 } },
                });
                break;
            }

            case "refunded": {
                if (!result.gatewayPaymentId) break;
                const payment = await db.payment.findFirst({
                    where: { razorpayPaymentId: result.gatewayPaymentId },
                });
                if (!payment) break;

                const isFullRefund = Math.abs((result.amount ?? 0) - Number(payment.amount)) < 0.01;
                await db.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            refundId: result.refundId,
                            refundAmount: result.amount,
                            status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
                        },
                    });
                    await tx.order.update({
                        where: { id: payment.orderId },
                        data: { paymentStatus: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
                    });
                });
                break;
            }
        }

        return { received: true };
    },

    async initiateRefund(orderId: string, actorId: string) {
        const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
        if (!order) throw new Error("Order not found");
        if (order.status !== "CANCELLED") throw new Error("Order must be cancelled first");

        const paidPayments = order.payments.filter((p) => p.status === "PAID");
        if (!paidPayments.length) throw new Error("No payments to refund");

        const gateway = PaymentFactory.get();
        const results = [];

        for (const payment of paidPayments) {
            if (!payment.razorpayPaymentId) continue;
            try {
                const refund = await gateway.initiateRefund({
                    gatewayPaymentId: payment.razorpayPaymentId,
                    amount: Number(payment.amount),
                    notes: { orderId, reason: "Order cancelled", actorId },
                });

                await db.payment.update({
                    where: { id: payment.id },
                    data: { refundId: refund.refundId, status: "REFUNDED", refundAmount: refund.amount },
                });

                results.push({ paymentId: payment.id, refundId: refund.refundId });
            } catch (err: any) {
                logger.error({ err: err.message, paymentId: payment.id }, "Refund failed");
            }
        }

        await db.auditLog.create({
            data: {
                sellerId: order.sellerId,
                actorId,
                actorType: "system",
                action: "REFUND_INITIATED",
                entityType: "order",
                entityId: orderId,
                metadata: { refunds: results },
            },
        });

        return results;
    },

    async getPayments(orderId: string) {
        return db.payment.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
    },
};