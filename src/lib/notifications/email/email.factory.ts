import { EmailProvider } from "./email.interface";
import { ResendProvider } from "./resend.provider";

type EmailProviderType = "resend";

class EmailFactory {
    private static instance: EmailProvider | null = null;

    static get(provider?: EmailProviderType): EmailProvider {
        if (!this.instance) {
            const key = (provider ?? process.env.EMAIL_PROVIDER ?? "resend") as EmailProviderType;
            this.instance = this.create(key);
        }
        return this.instance;
    }

    private static create(provider: EmailProviderType): EmailProvider {
        switch (provider) {
            case "resend":
                return new ResendProvider();
            default:
                throw new Error(`Unsupported email provider: ${provider}`);
        }
    }
}

export { EmailFactory };