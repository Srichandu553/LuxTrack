import axios from "axios";
import { authHeaders } from "./authService.js";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/price-reviews`;


/*
 * Get all pending price reviews
 */
export const getPendingPriceReviews = async () => {

    const response = await axios.get(
        `${API_URL}/pending`,
        { headers: authHeaders() }
    );

    return response.data;
};


/*
 * Get a single price review by ID
 */
export const getPriceReviewById = async (id) => {

    const response = await axios.get(
        `${API_URL}/${id}`,
        { headers: authHeaders() }
    );

    return response.data;
};


/*
 * Approve a price review
 *
 * adminNote is optional.
 */
export const approvePriceReview = async (
    id,
    adminNote = ""
) => {

    const response = await axios.put(
        `${API_URL}/${id}/approve`,
        {
            adminNote
        },
        { headers: authHeaders() }
    );

    return response.data;
};


/*
 * Reject a price review
 *
 * adminNote is optional.
 */
export const rejectPriceReview = async (
    id,
    adminNote = ""
) => {

    const response = await axios.put(
        `${API_URL}/${id}/reject`,
        {
            adminNote
        },
        { headers: authHeaders() }
    );

    return response.data;
};


/*
 * Get the number of pending price reviews
 *
 * This is useful for the Admin Dashboard.
 */
export const getPendingPriceReviewCount = async () => {

    const response = await axios.get(
        `${API_URL}/pending`,
        { headers: authHeaders() }
    );

    const data = response.data;

    if (
        data &&
        typeof data.count === "number"
    ) {

        return data.count;

    }


    if (
        data &&
        Array.isArray(data.data)
    ) {

        return data.data.length;

    }


    return 0;
};