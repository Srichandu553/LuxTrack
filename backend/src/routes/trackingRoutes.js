import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
    addWatchlist, removeWatchlist, listWatchlist,
    listAlerts, listAlertEvents, createAlert, updateAlert, deleteAlert
} from "../controllers/trackingController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/watchlist", listWatchlist);
router.post("/watchlist", addWatchlist);
router.delete("/watchlist/:assetId", removeWatchlist);
router.get("/alerts", listAlerts);
router.get("/alert-events", listAlertEvents);
router.post("/alerts", createAlert);
router.put("/alerts/:id", updateAlert);
router.delete("/alerts/:id", deleteAlert);
export default router;
