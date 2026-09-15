import axios from "axios";
import { authHeaders } from "./authService.js";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/tracking`;

export const getWatchlist = async () =>
    (await axios.get(`${API_URL}/watchlist`, { headers: authHeaders() })).data;

export const addToWatchlist = async (assetId) =>
    (await axios.post(`${API_URL}/watchlist`, { asset_id: assetId }, { headers: authHeaders() })).data;

export const removeFromWatchlist = async (assetId) =>
    (await axios.delete(`${API_URL}/watchlist/${assetId}`, { headers: authHeaders() })).data;

export const getAlerts = async () =>
    (await axios.get(`${API_URL}/alerts`, { headers: authHeaders() })).data;

export const getAlertEvents = async () =>
    (await axios.get(`${API_URL}/alert-events`, { headers: authHeaders() })).data;

export const createAlert = async (payload) =>
    (await axios.post(`${API_URL}/alerts`, payload, { headers: authHeaders() })).data;

export const updateAlert = async (id, payload) =>
    (await axios.put(`${API_URL}/alerts/${id}`, payload, { headers: authHeaders() })).data;

export const deleteAlert = async (id) =>
    (await axios.delete(`${API_URL}/alerts/${id}`, { headers: authHeaders() })).data;
