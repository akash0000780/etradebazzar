import { SmsProvider } from "./sms.interface";
import { Msg91Instance } from "./msg91.provider";

type SmsProviderType = "msg91";

class SmsFactory {
    private static instance: SmsProvider | null = null;

    static get(provider?: SmsProviderType): SmsProvider {
        if (!this.instance) {
            const key = (provider ?? process.env.SMS_PROVIDER ?? "msg91") as SmsProviderType;
            this.instance = this.create(key);
        }
        return this.instance;
    }

    private static create(provider: SmsProviderType): SmsProvider {
        switch (provider) {
            case "msg91":
                return new Msg91Instance();

            default:
                throw new Error(`Unsupported SMS provider: ${provider}`);
        }
    }
}

export { SmsFactory };