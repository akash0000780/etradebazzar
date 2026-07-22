import { PincodeDetails, PincodeProvider } from "./pincode.interface";
import { redis, RedisKeys } from "../../db/redis";

const INDIA_POST_API_URL = "https://api.postalpincode.in/pincode";
const PINCODE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

export class IndiaPostPincodeProvider implements PincodeProvider {
    async lookupByPincode(pincode: string): Promise<PincodeDetails> {
        if (!/^\d{6}$/.test(pincode)) {
            throw new Error("Invalid pincode format. Must be 6 digits.");
        }

        const cacheKey = RedisKeys.pincodeLookup(pincode);

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch {
            // cache unavailable fall through to live lookup
        }

        try {
            const response = await fetch(`${INDIA_POST_API_URL}/${pincode}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch pincode details: ${response.statusText}`);
            }

            const data = await response.json();

            // India Post API returns an array
            if (!Array.isArray(data) || data.length === 0 || data[0].Status !== "Success") {
                throw new Error("No data found for the provided pincode");
            }

            const postOffice = data[0].PostOffice[0]; // Take first post office

            const details: PincodeDetails = {
                pincode: postOffice.Pincode,
                city: postOffice.District,
                state: postOffice.State,
                district: postOffice.District,
                taluka: postOffice.Taluk,
                division: postOffice.Division,
                region: postOffice.Region,
                circle: postOffice.Circle,
                deliveryStatus: postOffice.DeliveryStatus,
                divisionName: postOffice.Division,
                regionName: postOffice.Region,
                circleName: postOffice.Circle
            };

            redis.setex(cacheKey, PINCODE_CACHE_TTL_SECONDS, JSON.stringify(details)).catch(() => null);

            return details;
        } catch (error) {
            throw new Error(`Pincode lookup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async lookupByCityState(_city: string, _state: string): Promise<string[]> {
        throw new Error("City/state to pincode lookup not implemented for India Post API");
    }
}
