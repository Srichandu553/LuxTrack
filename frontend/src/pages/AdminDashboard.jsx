import { useEffect, useState } from "react";

import {
    getPendingPriceReviews
} from "../services/priceReviewService.js";

import {
    getAllAssets
} from "../services/assetService.js";

import "./AdminDashboard.css";


function AdminDashboard({
    onOpenPriceReviews,
    onOpenAssetManagement,
    onOpenHome,
    onOpenTracking
}) {

    const [pendingCount, setPendingCount] =
        useState(0);

    const [assets, setAssets] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [assetsLoading, setAssetsLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [assetsError, setAssetsError] =
        useState("");


    /*
     * =========================================
     * LOAD PENDING PRICE REVIEWS
     * =========================================
     */

    const loadPendingReviews = async () => {

        try {

            setError("");

            const result =
                await getPendingPriceReviews();


            if (
                result &&
                Array.isArray(result.data)
            ) {

                setPendingCount(
                    result.data.length
                );

            } else {

                setPendingCount(0);

            }

        } catch (error) {

            console.error(
                "Failed to load pending reviews:",
                error
            );

            setError(
                "Unable to load pending price reviews."
            );

        } finally {

            setLoading(false);

        }

    };


    /*
     * =========================================
     * LOAD ALL ASSETS
     * =========================================
     */

    const loadAssets = async () => {

        try {

            setAssetsError("");

            const result =
                await getAllAssets();


            if (
                result &&
                Array.isArray(result.assets)
            ) {

                setAssets(
                    result.assets
                );

            } else {

                setAssets([]);

            }

        } catch (error) {

            console.error(
                "Failed to load assets:",
                error
            );

            setAssetsError(
                "Unable to load LuxTrack assets."
            );

        } finally {

            setAssetsLoading(false);

        }

    };


    /*
     * =========================================
     * LOAD DASHBOARD DATA
     * =========================================
     */

    useEffect(() => {

        // These loaders synchronize the dashboard with API state on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPendingReviews();
        loadAssets();

    }, []);


    /*
     * =========================================
     * FORMAT PRICE
     * =========================================
     */

    const formatPrice = (
        price,
        currency = "INR"
    ) => {

        const numericPrice =
            Number(price);


        if (
            !Number.isFinite(
                numericPrice
            )
        ) {

            return "Price unavailable";

        }


        if (
            currency === "INR"
        ) {

            return new Intl.NumberFormat(
                "en-IN",
                {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                }
            ).format(
                numericPrice
            );

        }


        return new Intl.NumberFormat(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        ).format(
            numericPrice
        );

    };


    /*
     * =========================================
     * DASHBOARD
     * =========================================
     */

    return (

        <div className="admin-dashboard">


            {/* =================================
                HEADER
            ================================= */}

            <header className="dashboard-header">

                <div className="dashboard-header-main">

                    <button
                        type="button"
                        className="dashboard-brand dashboard-home-link"
                        onClick={onOpenHome}
                    >
                        LUXTRACK
                    </button>


                    <h1>
                        Admin Dashboard
                    </h1>


                    <p>
                        Manage and verify luxury asset
                        market prices.
                    </p>

                </div>

                <div className="dashboard-header-actions">
                    <button type="button" className="dashboard-header-button" onClick={onOpenHome}>
                        ← Home
                    </button>
                    <button type="button" className="dashboard-header-button dashboard-header-button-primary" onClick={onOpenAssetManagement}>
                        Manage assets <span>→</span>
                    </button>
                </div>

            </header>


            <main className="dashboard-content">


                {/* =================================
                    PENDING PRICE REVIEWS
                ================================= */}

                <button
                    type="button"
                    className="dashboard-card dashboard-card-button"
                    onClick={onOpenPriceReviews}
                    aria-label={`Open ${pendingCount} pending price reviews`}
                >


                    <div className="dashboard-card-icon">
                        $
                    </div>


                    <div className="dashboard-card-content">

                        <span className="dashboard-card-label">
                            PRICE VERIFICATION
                        </span>


                        <h2>
                            Pending Price Reviews
                        </h2>


                        <p>
                            Review market reference prices
                            before they are applied to LuxTrack.
                        </p>

                    </div>


                    <div className="pending-count-container">

                        {loading ? (

                            <div className="pending-loading">
                                ...
                            </div>

                        ) : (

                            <div className="pending-count">
                                {pendingCount}
                            </div>

                        )}


                        <span>
                            Pending
                        </span>

                    </div>

                </button>


                {/* =================================
                    PRICE REVIEW CENTER
                ================================= */}

                <section className="review-action-card">


                    <div>

                        <h2>
                            Price Review Center
                        </h2>


                        <p>
                            Check reference prices, review
                            AI analysis, view the source and
                            approve or reject price updates.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="open-reviews-button"
                        onClick={
                            onOpenPriceReviews
                        }
                    >

                        Review Prices


                        <span>
                            →
                        </span>

                    </button>

                </section>

                <section className="review-action-card tracking-dashboard-card">
                    <div>
                        <span className="dashboard-card-label">PERSONAL MONITORING</span>
                        <h2>Watchlist &amp; Price Alerts</h2>
                        <p>Keep selected assets close and monitor target prices from one workspace.</p>
                    </div>
                    <button type="button" className="open-reviews-button" onClick={onOpenTracking}>
                        Open workspace <span>→</span>
                    </button>
                </section>


                {/* =================================
                    ALL LUXURY ASSETS
                ================================= */}

                <section className="assets-section">


                    <div className="assets-section-header">


                        <div>

                            <span className="dashboard-card-label">
                                LUXTRACK INVENTORY
                            </span>


                            <h2>
                                All Luxury Assets
                            </h2>


                            <p>
                                View all luxury assets currently
                                available in the LuxTrack database.
                            </p>

                        </div>


                        <div className="asset-section-actions">


                            <div className="asset-total">

                                {assetsLoading
                                    ? "..."
                                    : assets.length}

                                <span>
                                    Assets
                                </span>

                            </div>


                            <button
                                type="button"
                                className="manage-assets-button"
                                onClick={
                                    onOpenAssetManagement
                                }
                            >

                                Manage Assets

                                <span>
                                    →
                                </span>

                            </button>

                        </div>

                    </div>


                    {/* =================================
                        ASSETS LOADING
                    ================================= */}

                    {assetsLoading && (

                        <div className="assets-message">

                            Loading luxury assets...

                        </div>

                    )}


                    {/* =================================
                        ASSETS ERROR
                    ================================= */}

                    {!assetsLoading &&
                        assetsError && (

                        <div className="assets-error">

                            <span>
                                {assetsError}
                            </span>


                            <button
                                type="button"
                                onClick={() => {

                                    setAssetsLoading(
                                        true
                                    );

                                    loadAssets();

                                }}
                            >

                                Retry

                            </button>

                        </div>

                    )}


                    {/* =================================
                        NO ASSETS
                    ================================= */}

                    {!assetsLoading &&
                        !assetsError &&
                        assets.length === 0 && (

                        <div className="assets-message">

                            No luxury assets found.

                        </div>

                    )}


                    {/* =================================
                        ASSET CARDS
                    ================================= */}

                    {!assetsLoading &&
                        !assetsError &&
                        assets.length > 0 && (

                        <div className="assets-grid">


                            {assets.map(
                                (asset) => (

                                <article
                                    className="asset-card"
                                    key={asset.id}
                                >


                                    {/* IMAGE */}

                                    <div className="asset-image-container">


                                        {asset.image_url ? (

                                            <img
                                                src={
                                                    asset.image_url
                                                }
                                                alt={
                                                    asset.name
                                                }
                                                className="asset-image"
                                                onError={(
                                                    event
                                                ) => {

                                                    event.currentTarget.style.display =
                                                        "none";

                                                    event.currentTarget
                                                        .parentElement
                                                        .classList.add(
                                                            "asset-image-fallback"
                                                        );

                                                }}
                                            />

                                        ) : (

                                            <div className="asset-image-placeholder">

                                                {asset.category ===
                                                "Luxury Watches"
                                                    ? "⌚"
                                                    : asset.category ===
                                                      "Luxury Cars"
                                                        ? "🚗"
                                                        : "◆"}

                                            </div>

                                        )}

                                    </div>


                                    {/* ASSET INFORMATION */}

                                    <div className="asset-card-body">


                                        <div className="asset-category">

                                            {asset.category ||
                                                "Uncategorized"}

                                        </div>


                                        <h3>
                                            {asset.name}
                                        </h3>


                                        <p className="asset-brand">

                                            {asset.brand ||
                                                "Unknown brand"}


                                            {asset.model
                                                ? ` • ${asset.model}`
                                                : ""}

                                        </p>


                                        {/* PRICE */}

                                        <div className="asset-price">

                                            {formatPrice(
                                                asset.current_price,
                                                asset.currency
                                            )}

                                        </div>


                                        {/* DETAILS */}

                                        <div className="asset-details">


                                            <div>

                                                <span>
                                                    Condition
                                                </span>

                                                <strong>
                                                    {
                                                        asset.condition ||
                                                        "N/A"
                                                    }
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Rarity
                                                </span>

                                                <strong>
                                                    {
                                                        asset.rarity ||
                                                        "N/A"
                                                    }
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Release
                                                </span>

                                                <strong>
                                                    {
                                                        asset.release_year ||
                                                        "N/A"
                                                    }
                                                </strong>

                                            </div>

                                        </div>


                                        {/* SOURCE */}

                                        <div className="asset-source">


                                            <span>
                                                Price Source
                                            </span>


                                            <strong>

                                                {
                                                    asset.price_source ||
                                                    "Not available"
                                                }

                                            </strong>

                                        </div>

                                    </div>

                                </article>

                            ))}

                        </div>

                    )}

                </section>


                {/* =================================
                    BACKEND STATUS
                ================================= */}

                <section className="system-status-card">


                    <div className="status-indicator">
                        ✓
                    </div>


                    <div>

                        <h3>
                            Backend Connection
                        </h3>


                        <p>
                            LuxTrack price review service is
                            connected and operational.
                        </p>

                    </div>


                    <span className="status-online">
                        ONLINE
                    </span>

                </section>


                {/* =================================
                    ERROR
                ================================= */}

                {error && (

                    <div className="dashboard-error">

                        <span>
                            {error}
                        </span>


                        <button
                            type="button"
                            onClick={
                                loadPendingReviews
                            }
                        >

                            Retry

                        </button>

                    </div>

                )}

            </main>

        </div>

    );

}


export default AdminDashboard;