import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

import {
    getAssets,
    getAssetById,
    getAssetAIAnalysis,
    createAsset,
    updateAsset,
    deleteAsset,
    restoreAsset,
    getArchivedAssets,
    seedCatalogRecords
} from "../controllers/assetController.js";


const router = express.Router();


/*
|--------------------------------------------------------------------------
| GET ALL ASSETS
|--------------------------------------------------------------------------
*/
router.get(
    "/",
    getAssets
);

router.get(
    "/archived",
    requireAuth,
    requireAdmin,
    getArchivedAssets
);


/*
|--------------------------------------------------------------------------
| GET SINGLE ASSET
|--------------------------------------------------------------------------
*/
router.get(
    "/seed",
    requireAuth,
    requireAdmin,
    seedCatalogRecords
);

router.post(
    "/seed",
    requireAuth,
    requireAdmin,
    seedCatalogRecords
);

router.get(
    "/:id",
    getAssetById
);


/*
|--------------------------------------------------------------------------
| GET ASSET AI VALUATION ANALYSIS
|--------------------------------------------------------------------------
*/
router.get(
    "/:id/ai-analysis",
    getAssetAIAnalysis
);


/*
|--------------------------------------------------------------------------
| CREATE ASSET
|--------------------------------------------------------------------------
*/
router.post(
    "/",
    requireAuth,
    requireAdmin,
    createAsset
);


/*
|--------------------------------------------------------------------------
| UPDATE ASSET
|--------------------------------------------------------------------------
*/
router.put(
    "/:id",
    requireAuth,
    requireAdmin,
    updateAsset
);


/*
|--------------------------------------------------------------------------
| DELETE ASSET
|--------------------------------------------------------------------------
*/
router.delete(
    "/:id",
    requireAuth,
    requireAdmin,
    deleteAsset
);

router.post(
    "/:id/restore",
    requireAuth,
    requireAdmin,
    restoreAsset
);


export default router;