import { z } from "zod";

export const bulkCancelShipmentsSchema = z.object({
    body: z.object({ shipmentIds: z.array(z.string()).min(1) }),
});