import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        localStorage.setItem('token', response.data.token);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('token');
};

export const getCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
        return JSON.parse(atob(token.split('.')[1]));
    }
    return null;
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};