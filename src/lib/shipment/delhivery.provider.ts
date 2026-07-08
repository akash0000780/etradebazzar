import type {
    ShipmentProvider,
    CreateShipmentInput,
    ShipmentResult,
    TrackingResult,
    ServiceabilityResult,
    WebhookEvent,
} from "./shipment.interface";

export class DelhiveryInstance implements ShipmentProvider {
    async createShipment(_input: CreateShipmentInput): Promise<ShipmentResult> {
        throw new Error("Delhivery pending logic");
    }

    async trackShipment(_trackingId: string): Promise<TrackingResult> {
        throw new Error("Delhivery pending logic");
    }

    async cancelShipment(_trackingIds: string[]): Promise<void> {
        throw new Error("Delhivery pending logic");
    }

    async getServiceability(
        _pickupPincode: string,
        _deliveryPincode: string,
        _weight: number,
        _cod: boolean
    ): Promise<ServiceabilityResult> {
        throw new Error("Delhivery pending logic");
    }

    async createReversePickup(_input: CreateShipmentInput): Promise<ShipmentResult> {
        throw new Error("Delhivery pending logic");
    }

    verifyWebhook(_payload: any, _signature: string): boolean {
        throw new Error("Delhivery pending logic");
    }

    parseWebhookEvent(_payload: any): WebhookEvent {
        throw new Error("Delhivery pending logic");
    }
}