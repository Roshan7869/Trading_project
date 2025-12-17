import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auth APIs
export const authAPI = {
    register: (data: { name: string; email: string; password: string }) =>
        api.post('/api/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/api/auth/login', data),
}

// User APIs
export const userAPI = {
    getProfile: () => api.get('/api/user/profile'),
    getWallet: () => api.get('/api/user/wallet'),
}

// Order APIs
export const orderAPI = {
    placeOrder: (data: {
        symbol: string
        type: 'BUY' | 'SELL'
        quantity: number
        price: number
    }) => api.post('/api/order/place', data),
    getHistory: () => api.get('/api/order/history'),
}

// Portfolio APIs
export const portfolioAPI = {
    get: () => api.get('/api/portfolio'),
}

// Watchlist APIs
export const watchlistAPI = {
    get: () => api.get('/api/watchlist'),
    add: (symbol: string) => api.post('/api/watchlist/add', { symbol }),
    remove: (symbol: string) => api.post('/api/watchlist/remove', { symbol }),
}

// Market APIs
export const marketAPI = {
    getPrices: () => api.get('/api/market/prices'),
    getPrice: (symbol: string) => api.get(`/api/market/price/${symbol}`),
}