import axios from "axios";
import { authHeaders } from "./authService.js";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assets`;


/*
 * Get all LuxTrack assets
 */
export const getAllAssets = async (params = {}) => {

    const response = await axios.get(
        API_URL,
        { params }
    );

    return response.data;

};


/*
 * Get single LuxTrack asset with price history
 */
export const getAssetById = async (id) => {

    const response = await axios.get(
        `${API_URL}/${id}`
    );

    return response.data;

};


/*
 * Get AI Price Valuation & Analysis for an asset
 */
export const getAssetAIAnalysis = async (id) => {

    const response = await axios.get(
        `${API_URL}/${id}/ai-analysis`
    );

    return response.data;

};

export const createAsset = async (asset) =>
    (await axios.post(API_URL, asset, { headers: authHeaders() })).data;

export const updateAsset = async (id, asset) =>
    (await axios.put(`${API_URL}/${id}`, asset, { headers: authHeaders() })).data;

export const archiveAsset = async (id) =>
    (await axios.delete(`${API_URL}/${id}`, { headers: authHeaders() })).data;

export const restoreAsset = async (id) =>
    (await axios.post(`${API_URL}/${id}/restore`, {}, { headers: authHeaders() })).data;

export const getArchivedAssets = async () =>
    (await axios.get(`${API_URL}/archived`, { headers: authHeaders() })).data;

export const getCategories = async () =>
    (await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/categories`)).data;