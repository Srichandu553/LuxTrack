import { useEffect, useState } from "react";

import {
    getPendingPriceReviews,
    approvePriceReview,
    rejectPriceReview
} from "../services/priceReviewService.js";

import "./AdminPriceReviews.css";


function AdminPriceReviews() {

    const [reviews, setReviews] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [processingId, setProcessingId] = useState(null);

    const [adminNotes, setAdminNotes] = useState({});


    /*
     * Load pending price reviews
     */
    const loadReviews = async () => {

        try {

            setLoading(true);

            setError("");

            const response =
                await getPendingPriceReviews();

            console.log(
                "Reviews received by frontend:",
                response
            );

            setReviews(Array.isArray(response) ? response : response?.data || []);

        } catch (error) {

            console.error(
                "Failed to load price reviews:",
                error
            );

            setError(
                "Failed to load price reviews."
            );

        } finally {

            setLoading(false);

        }
    };


    /*
     * Load reviews when page opens
     */
    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadReviews();

    }, []);


    /*
     * Handle admin note
     */
    const handleNoteChange = (
        reviewId,
        value
    ) => {

        setAdminNotes(
            (currentNotes) => ({
                ...currentNotes,
                [reviewId]: value
            })
        );

    };


    /*
     * Approve review
     */
    const handleApprove = async (
        review
    ) => {

        const note =
            adminNotes[review.id]?.trim() || "";


        const confirmed =
            window.confirm(
                `Approve the reference price for ${review.asset}?`
            );


        if (!confirmed) {

            return;

        }


        try {

            setProcessingId(review.id);


            await approvePriceReview(
                review.id,
                note
            );


            /*
             * Remove approved review
             */
            setReviews(
                (currentReviews) =>
                    currentReviews.filter(
                        (item) =>
                            item.id !== review.id
                    )
            );


            /*
             * Remove note from state
             */
            setAdminNotes(
                (currentNotes) => {

                    const updatedNotes = {
                        ...currentNotes
                    };

                    delete updatedNotes[
                        review.id
                    ];

                    return updatedNotes;

                }
            );


        } catch (error) {

            console.error(
                "Approve error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to approve price review."
            );

        } finally {

            setProcessingId(null);

        }

    };


    /*
     * Reject review
     */
    const handleReject = async (
        review
    ) => {

        const note =
            adminNotes[review.id]?.trim() || "";


        const confirmed =
            window.confirm(
                `Reject the reference price for ${review.asset}?`
            );


        if (!confirmed) {

            return;

        }


        try {

            setProcessingId(review.id);


            await rejectPriceReview(
                review.id,
                note
            );


            /*
             * Remove rejected review
             */
            setReviews(
                (currentReviews) =>
                    currentReviews.filter(
                        (item) =>
                            item.id !== review.id
                    )
            );


            /*
             * Remove note from state
             */
            setAdminNotes(
                (currentNotes) => {

                    const updatedNotes = {
                        ...currentNotes
                    };

                    delete updatedNotes[
                        review.id
                    ];

                    return updatedNotes;

                }
            );


        } catch (error) {

            console.error(
                "Reject error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to reject price review."
            );

        } finally {

            setProcessingId(null);

        }

    };


    /*
     * Format INR price
     */
    const formatPrice = (price) => {

        const number =
            Number(price);


        if (!Number.isFinite(number)) {

            return "₹0";

        }


        return `₹${number.toLocaleString(
            "en-IN"
        )}`;

    };


    /*
     * Scroll to pending reviews
     */
    const scrollToPendingReviews = () => {

        const element =
            document.getElementById(
                "pending-reviews"
            );


        if (element) {

            element.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    };


    /*
     * Loading
     */
    if (loading) {

        return (

            <div className="admin-reviews-page">

                <div className="loading-state">

                    Loading price reviews...

                </div>

            </div>

        );

    }


    /*
     * Error
     */
    if (error) {

        return (

            <div className="admin-reviews-page">

                <div className="error-state">

                    {error}

                </div>


                <button
                    type="button"
                    className="retry-button"
                    onClick={loadReviews}
                >
                    Try Again
                </button>

            </div>

        );

    }


    return (

        <div className="admin-reviews-page">


            {/* ================================= */}
            {/* PAGE HEADER */}
            {/* ================================= */}

            <div className="admin-reviews-header">


                <div>

                    <h1>
                        Admin Price Reviews
                    </h1>


                    <p>
                        Review and verify market reference
                        prices before they are applied to LuxTrack.
                    </p>

                </div>


                {/* CLICKABLE PENDING BUTTON */}

                <button
                    type="button"
                    className="review-count"
                    onClick={
                        scrollToPendingReviews
                    }
                    title="View pending reviews"
                >

                    Pending Reviews: {reviews.length}

                </button>


            </div>


            {/* ================================= */}
            {/* REVIEWS */}
            {/* ================================= */}

            {reviews.length === 0 ? (

                <div className="empty-state">

                    <div className="empty-icon">
                        ✓
                    </div>


                    <h2>
                        No Pending Reviews
                    </h2>


                    <p>
                        All price updates have been reviewed.
                    </p>

                </div>

            ) : (

                <div
                    className="reviews-list"
                    id="pending-reviews"
                >


                    {reviews.map(
                        (review) => (

                            <div
                                className="review-card"
                                key={review.id}
                            >


                                {/* ============================== */}
                                {/* REVIEW HEADER */}
                                {/* ============================== */}

                                <div className="review-card-header">


                                    <div>

                                        <h2>
                                            {review.asset}
                                        </h2>


                                        <p className="review-brand">

                                            {review.brand}

                                            {" • "}

                                            {review.model}

                                        </p>

                                    </div>


                                    <span className="confidence-badge">

                                        {review.confidence}
                                        {" Confidence"}

                                    </span>


                                </div>


                                {/* ============================== */}
                                {/* PRICE COMPARISON */}
                                {/* ============================== */}

                                <div className="price-comparison">


                                    <div className="price-box">


                                        <span className="price-label">

                                            LuxTrack Current Price

                                        </span>


                                        <div className="price-value">

                                            {formatPrice(
                                                review.current_price
                                            )}

                                        </div>


                                    </div>


                                    <div className="price-box">


                                        <span className="price-label">

                                            Market Reference Price

                                        </span>


                                        <div className="price-value reference-price">

                                            {formatPrice(
                                                review.reference_price
                                            )}

                                        </div>


                                    </div>


                                </div>


                                {/* ============================== */}
                                {/* REVIEW DETAILS */}
                                {/* ============================== */}

                                <div className="review-details">


                                    <div className="detail-item">


                                        <span className="detail-label">

                                            Source

                                        </span>


                                        <span className="detail-value">

                                            {review.source ||
                                                "Unknown"}

                                        </span>


                                    </div>


                                    <div className="detail-item">


                                        <span className="detail-label">

                                            Price Type

                                        </span>


                                        <span className="detail-value">

                                            {review.price_type ||
                                                "market_reference"}

                                        </span>


                                    </div>


                                    <div className="detail-item">


                                        <span className="detail-label">

                                            Review Status

                                        </span>


                                        <span className="detail-value">

                                            {review.status ||
                                                "pending"}

                                        </span>


                                    </div>


                                    <div className="detail-item">


                                        <span className="detail-label">

                                            Source Link

                                        </span>


                                        <span className="detail-value">


                                            {review.source_url ? (

                                                <a
                                                    className="source-link"
                                                    href={
                                                        review.source_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >

                                                    View Source ↗

                                                </a>

                                            ) : (

                                                "Not available"

                                            )}


                                        </span>


                                    </div>


                                </div>


                                {/* ============================== */}
                                {/* AI ANALYSIS */}
                                {/* ============================== */}

                                {review.analysis && (

                                    <div className="ai-analysis">


                                        <h3>

                                            AI Price Analysis

                                        </h3>


                                        <p>

                                            {
                                                review.analysis
                                                    .assessment ||
                                                "No assessment available."
                                            }

                                        </p>


                                        <div className="analysis-info">


                                            <p>

                                                <strong>
                                                    Difference:
                                                </strong>

                                                {" "}

                                                {formatPrice(
                                                    review.analysis
                                                        .difference
                                                )}

                                            </p>


                                            <p>

                                                <strong>
                                                    Price Status:
                                                </strong>

                                                {" "}

                                                <span className="analysis-status">

                                                    {
                                                        review.analysis
                                                            .status ||
                                                        "Unknown"
                                                    }

                                                </span>

                                            </p>


                                        </div>


                                    </div>

                                )}


                                {/* ============================== */}
                                {/* ADMIN NOTE */}
                                {/* ============================== */}

                                <div className="admin-note">


                                    <label
                                        htmlFor={
                                            `admin-note-${review.id}`
                                        }
                                    >

                                        Admin Note

                                    </label>


                                    <textarea
                                        id={
                                            `admin-note-${review.id}`
                                        }
                                        value={
                                            adminNotes[
                                                review.id
                                            ] || ""
                                        }
                                        onChange={
                                            (event) =>
                                                handleNoteChange(
                                                    review.id,
                                                    event.target.value
                                                )
                                        }
                                        placeholder="Enter a reason for approving or rejecting this price..."
                                        rows={4}
                                        disabled={
                                            processingId ===
                                            review.id
                                        }
                                    />


                                    <div className="admin-note-help">

                                        This note will be saved with the review decision.

                                    </div>


                                </div>


                                {/* ============================== */}
                                {/* BUTTONS */}
                                {/* ============================== */}

                                <div className="review-actions">


                                    <button
                                        type="button"
                                        className="review-button approve-button"
                                        onClick={() =>
                                            handleApprove(
                                                review
                                            )
                                        }
                                        disabled={
                                            processingId ===
                                            review.id
                                        }
                                    >

                                        {processingId ===
                                        review.id

                                            ? "Processing..."

                                            : "✓ Approve Price"}

                                    </button>


                                    <button
                                        type="button"
                                        className="review-button reject-button"
                                        onClick={() =>
                                            handleReject(
                                                review
                                            )
                                        }
                                        disabled={
                                            processingId ===
                                            review.id
                                        }
                                    >

                                        {processingId ===
                                        review.id

                                            ? "Processing..."

                                            : "✕ Reject Price"}

                                    </button>


                                </div>


                            </div>

                        )
                    )}

                </div>

            )}

        </div>

    );

}


export default AdminPriceReviews;