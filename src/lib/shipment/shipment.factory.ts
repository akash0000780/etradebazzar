import { DelhiveryInstance } from "./delhivery.provider";
import { ShipmentProvider } from "./shipment.interface";
import { ShiprocketInstance } from "./shiprocket.provider";

type ProviderType = "shiprocket" | "delhivery";


class ShipmentFactory {
    private static instances: Partial<Record<ProviderType, ShipmentProvider>> = {};

    static get(provider?: ProviderType): ShipmentProvider {
        const key = (provider ?? process.env.SHIPMENT_PROVIDER ?? "shiprocket") as ProviderType;
        if (!this.instances[key]) {
            this.instances[key] = this.create(key);
        }
        return this.instances[key]!;
    }

    private static create(provider: ProviderType): ShipmentProvider {
        switch (provider) {
            case "shiprocket":
                return new ShiprocketInstance();
            case "delhivery":
                return new DelhiveryInstance();
            default:
                throw new Error(`Unsupported shipment provider: ${provider}`);
        }
    }
}

export { ShipmentFactory };