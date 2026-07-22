import { PanProvider, PanDetails } from "./pan.interface";

const BASE_URL = "https://kyc-api.surepass.io/api/v1";

// need confirmation from surepass team if this is the correct endpoint for PAN verification
const PAN_ENDPOINT = `${BASE_URL}/pan/pan-comprehensive`;

export class SurepassPanInstance implements PanProvider {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    async verifyPan(panNumber: string): Promise<PanDetails> {
        const res = await fetch(PAN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ id_number: panNumber }),
        });

        if (!res.ok)
            throw new Error("PAN verification failed - invalid PAN or service error");

        const data = (await res.json()) as any;
        const result = data.data;

        if (!result)
            throw new Error("PAN verification failed - invalid PAN or service error");

        return {
            panNumber: result.pan_number ?? panNumber,
            fullName: result.full_name ?? result.registered_name ?? "",
            category: result.category,
            status: result.status ?? (result.valid ? "VALID" : "INVALID"),
            aadhaarSeedingStatus: result.aadhaar_seeding_status,
            raw: result,
        };
    }
}