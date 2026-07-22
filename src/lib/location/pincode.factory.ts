import { PincodeProvider } from "./pincode.interface";
import { IndiaPostPincodeProvider } from "./pincode.provider";

type PincodeProviderType = "indiapost";

class PincodeFactory {
    private static instances: Partial<Record<PincodeProviderType, PincodeProvider>> = {};

    static get(): PincodeProvider {
        const key = (process.env["PINCODE_PROVIDER"] ?? "indiapost") as PincodeProviderType;

        if (!this.instances[key]) {
            this.instances[key] = this.create(key);
        }

        return this.instances[key]!;
    }

    private static create(provider: PincodeProviderType): PincodeProvider {
        switch (provider) {
            case "indiapost":
                return new IndiaPostPincodeProvider();
            default:
                throw new Error(`Unsupported pincode provider: ${provider}`);
        }
    }
}

export { PincodeFactory };
