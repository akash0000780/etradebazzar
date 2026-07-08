import { Router } from "express";
import { addressController } from "./address.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { createAddressSchema, updateAddressSchema, addressParamSchema } from "./address.schema";

const router = Router();

router.get("/", protect, sellerLimiter, addressController.listAddresses);
router.post("/", protect, sellerLimiter, validate(createAddressSchema), addressController.createAddress);
router.patch("/:addressId", protect, sellerLimiter, validate(updateAddressSchema), addressController.updateAddress);
router.delete("/:addressId", protect, sellerLimiter, validate(addressParamSchema), addressController.deleteAddress);

export default router;