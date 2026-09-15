import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth`;
const TOKEN_KEY = "luxtrack_admin_token";

export const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, {
        email,
        password
    });

    localStorage.setItem(TOKEN_KEY, response.data.token);
    return response.data;
};

export const register = async (name, email, password) => {
    const response = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password
    });

    localStorage.setItem(TOKEN_KEY, response.data.token);
    return response.data;
};

export const requestPasswordReset = async (email) => {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
};

export const resetPassword = async (token, password) => {
    const response = await axios.post(`${API_URL}/reset-password`, {
        token,
        password
    });
    return response.data;
};

export const getAuthToken = () =>
    localStorage.getItem(TOKEN_KEY);

export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
};

export const getProfile = async () =>
    (await axios.get(`${API_URL}/profile`, { headers: authHeaders() })).data;

export const changePassword = async (currentPassword, newPassword) =>
    (await axios.post(`${API_URL}/change-password`, {
        currentPassword,
        newPassword
    }, { headers: authHeaders() })).data;

export const updateProfile = async (name) =>
    (await axios.put(`${API_URL}/profile`, { name }, { headers: authHeaders() })).data;

export const authHeaders = () => {
    const token = getAuthToken();
    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
};
