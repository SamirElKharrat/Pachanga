import axios from 'axios';

/**
 * API service for communicating with the Pachanga backend.
 * Handles authentication and provides standardized methods for CRUD operations.
 */
const API_URL = "";

// Configure Axios to always send cookies for cross-origin requests
axios.defaults.withCredentials = true;

export const API = {

    /**
     * Stores the authentication token (Obsolete with HTTP-only cookies).
     * @param {string} token - The JWT token to store.
     */
    setToken(token) {
        // Obsolete: Cookie is managed automatically by the browser
    },

    /**
     * Retrieves the authentication token (Obsolete with HTTP-only cookies).
     * @returns {null} Always returns null.
     */
    getToken() {
        // Obsolete: Cookie is managed automatically by the browser
        return null;
    },

    /**
     * Fetches the current user profile using the session cookie.
     * @returns {Promise<Object>} The user profile data.
     * @throws {Error} If the request fails.
     */
    async getUserByToken() {
        const response = await axios.get(`${API_URL}/users/getToken`);
        return response.data;
    },

    /**
     * Performs a GET request to the specified endpoint.
     * @param {string} url - The relative URL path (starts with /).
     * @returns {Promise<any>} The response data.
     */
    async get(url) {
        const response = await axios.get(`${API_URL}${url}`);
        return response.data;
    },

    /**
     * Performs a POST request to the specified endpoint.
     * @param {string} url - The relative URL path.
     * @param {Object} data - The payload to send.
     * @returns {Promise<any>} The response data.
     */
    async post(url, data) {
        const response = await axios.post(`${API_URL}${url}`, data);
        return response.data;
    },

    /**
     * Performs a PUT request to update data.
     * @param {string} url - The relative URL path.
     * @param {Object} data - The updated payload.
     * @returns {Promise<any>} The updated response data.
     */
    async put(url, data) {
        const response = await axios.put(`${API_URL}${url}`, data);
        return response.data;
    },

    /**
     * Performs a DELETE request to remove data.
     * @param {string} url - The relative URL path.
     * @returns {Promise<any>} The response confirmation.
     */
    async delete(url) {
        const response = await axios.delete(`${API_URL}${url}`);
        return response.data;
    },
}