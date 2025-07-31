import axios from 'axios';
const API_URL = 'http://localhost:3001/api';

export const API = {

    setToken(token) {
        localStorage.setItem('token', token);
    },

    getToken() {
        return localStorage.getItem('token');
    },

    async getUserByToken() {
        const response = await axios.get(`${API_URL}/users/getToken`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    async get(url) {
        const response = await axios.get(`${API_URL}${url}`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    async post(url, data) {
        const response = await axios.post(`${API_URL}${url}`, data, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    async put(url, data) {
        const response = await axios.put(`${API_URL}${url}`, data, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },

    async delete(url) {
        const response = await axios.delete(`${API_URL}${url}`, {
            headers: {
                Authorization: `Bearer ${this.getToken()}`,
            },
        });
        return response.data;
    },
}