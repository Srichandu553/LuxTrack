import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

import {
    getPendingPriceReviews,
    getPriceReviewById,
    approvePriceReview,
    rejectPriceReview
} from "../controllers/priceReviewController.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

/*
 * Get all pending reviews
 */
router.get(
    "/pending",
    getPendingPriceReviews
);


/*
 * Get one review
 */
router.get(
    "/:id",
    getPriceReviewById
);


/*
 * Approve a review
 */
router.put(
    "/:id/approve",
    approvePriceReview
);


/*
 * Reject a review
 */
router.put(
    "/:id/reject",
    rejectPriceReview
);

export default router;