import { PaymentGateway } from "./gateway.interface";
import { RazorpayInstance } from "./razorpay.gateway";

type GatewayProvider = "razorpay";

class PaymentFactory {
    private static instances: Partial<Record<GatewayProvider, PaymentGateway>> = {};

    static get(provider?: GatewayProvider): PaymentGateway {
        const key = (provider ?? process.env.PAYMENT_GATEWAY ?? "razorpay") as GatewayProvider;

        if (!this.instances[key]) {
            this.instances[key] = this.create(key);
        }
        return this.instances[key]!;
    }
    private static create(provider: GatewayProvider): PaymentGateway {

        switch (provider) {
            case "razorpay":
                return new RazorpayInstance();

            default:
                throw new Error(`Unsupported payment gateway: ${provider}`);
        }
    }
}
export { PaymentFactory };
export type { GatewayProvider };