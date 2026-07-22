import { PanProvider, PanDetails } from "./pan.interface";

export class SandboxPanInstance implements PanProvider {
    constructor(
        private apiKey: string,
        private apiSecret: string,
    ) { }

    async verifyPan(panNumber: string): Promise<PanDetails> {
        const isWellFormed = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber);

        return {
            panNumber,
            fullName: isWellFormed ? "SANDBOX TEST USER" : "",
            category: "Individual",
            status: isWellFormed ? "VALID" : "INVALID",
            aadhaarSeedingStatus: "LINKED",
            raw: { sandbox: true, apiKey: this.apiKey ? "set" : "unset" },
        };
    }
}