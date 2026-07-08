import { Router } from "express";
import { walletController } from "./wallet.controller";
import { protect } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import { topupSchema, listTransactionsSchema } from "./wallet.schema";

const router = Router();

router.get("/balance", protect, sellerLimiter, walletController.getBalance);
router.post("/topup", protect, sellerLimiter, validate(topupSchema), walletController.topup);
router.get("/transactions", protect, sellerLimiter, validate(listTransactionsSchema), walletController.getTransactions);
router.get("/topups", protect, sellerLimiter, walletController.getTopupHistory);

export default router;