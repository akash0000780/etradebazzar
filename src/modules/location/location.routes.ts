import { Router } from "express";
import { locationController } from "./location.controller";
import { validate } from "../../utils/validate";
import { publicLimiter } from "../../middleware/rate-limit";
import { pincodeParamSchema } from "./location.schema";

const router = Router();

router.get("/pincode/:pincode", publicLimiter, validate(pincodeParamSchema), locationController.lookupPincode);

export default router;
