import axios from 'axios';

/**
 * API service for communicating with the Pachanga backend.
 * Handles authentication and provides standardized methods for CRUD operations.
 */
const API_URL = import.meta.env.VITE_API_URL;

export const API = {

    /**
     * Stores the authentication token in local storage.
     * @param {string} token - The JWT token to store.
     */
    setToken(token) {
        localStorage.setItem('token', token);
    },

    /**
     * Retrieves the authentication token from local storage.
     * @returns {string|null} The stored token or null if not found.
     */
    getToken() {
        return localStorage.getItem('token');
    },

    /**
     * Fetches the current user profile using the stored token.
     * @returns {Promise<Object>} The user profile data.
     * @throws {Error} If the request fails.
     */
    async getUserByToken() {
        const response = await axios.get(`${API_URL}/users/getToken`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    /**
     * Performs a GET request to the specified endpoint.
     * @param {string} url - The relative URL path (starts with /).
     * @returns {Promise<any>} The response data.
     */
    async get(url) {
        const response = await axios.get(`${API_URL}${url}`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    /**
     * Performs a POST request to the specified endpoint.
     * @param {string} url - The relative URL path.
     * @param {Object} data - The payload to send.
     * @returns {Promise<any>} The response data.
     */
    async post(url, data) {
        const response = await axios.post(`${API_URL}${url}`, data, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    /**
     * Performs a PUT request to update data.
     * @param {string} url - The relative URL path.
     * @param {Object} data - The updated payload.
     * @returns {Promise<any>} The updated response data.
     */
    async put(url, data) {
        const response = await axios.put(`${API_URL}${url}`, data, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    /**
     * Performs a DELETE request to remove data.
     * @param {string} url - The relative URL path.
     * @returns {Promise<any>} The response confirmation.
     */
    async delete(url) {
        const response = await axios.delete(`${API_URL}${url}`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },
}