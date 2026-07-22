import type { PayoutProvider } from "./payout.interface";
import { RazorpayXInstance } from "./razorpayx.provider";

type PayoutProviderType = "razorpayx";

class PayoutFactory {
    static get(keyId: string, keySecret: string, sourceAccountNumber: string,provider?: PayoutProviderType
    ): PayoutProvider {
        const key = (provider ?? process.env.PAYOUT_PROVIDER ?? "razorpayx") as PayoutProviderType;
        switch (key) {
            case "razorpayx":
                return new RazorpayXInstance(keyId, keySecret, sourceAccountNumber);
            default:
                throw new Error(`Unsupported payout provider: ${key}`);
        }
    }
}

export { PayoutFactory };
export type { PayoutProviderType };