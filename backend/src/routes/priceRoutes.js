import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

import {
    updatePrice,
    checkPrice,
    verifyAndUpdatePrice
} from "../controllers/priceController.js";

const router = express.Router();

// Check current/reference price
router.get("/check/:id", checkPrice);

// Update using verified external reference price
router.put("/verify-update/:id", requireAuth, requireAdmin, verifyAndUpdatePrice);

// Manual price update
router.put("/:id", requireAuth, requireAdmin, updatePrice);

export default router;