import axios from 'axios'

const API_URL = typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || 'http://backend:4000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Helper function to safely get Clerk token with retry
const getClerkToken = async (retries = 3, delay = 100): Promise<string | null> => {
    for (let i = 0; i < retries; i++) {
        if (typeof window !== 'undefined' && (window as any).Clerk?.session) {
            try {
                const token = await (window as any).Clerk.session.getToken();
                if (token) return token;
            } catch (e) {
                console.warn('Failed to get Clerk token, retrying...', e);
            }
        }
        // Wait before retry (exponential backoff)
        if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    return null;
};

// Add token to requests with improved reliability
api.interceptors.request.use(async (config) => {
    const token = await getClerkToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't spam console for expected auth errors (401) or network errors during initial load
        const status = error.response?.status;
        const isAuthError = status === 401;
        const isNetworkError = !error.response && error.code === 'ERR_NETWORK';

        // Only log non-auth errors or unexpected errors
        if (!isAuthError && !isNetworkError) {
            console.error('API Error:', {
                url: error.config?.url,
                method: error.config?.method,
                status: status,
                data: error.response?.data,
                message: error.message
            });
        }

        return Promise.reject(error);
    }
)

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

// Order APIs - Using simplified endpoint
export const orderAPI = {
    placeOrder: (data: {
        symbol: string
        type: 'BUY' | 'SELL'
        quantity: number
        price?: number
    }) => api.post('/api/order/quick', data),
    getHistory: (accountId?: string) => api.get('/api/order/history', { params: { accountId } }),
}

// Portfolio APIs - Updated to match new backend response
export const portfolioAPI = {
    get: () => api.get('/api/portfolio'),
    getSummary: () => api.get('/api/portfolio/summary'),
}

// Account APIs
export const accountAPI = {
    getAccounts: () => api.get('/api/accounts'),
    create: (data: { accountName: string; initialCapital?: number }) =>
        api.post('/api/accounts', data),
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

// Settings APIs
export const settingsAPI = {
    getBrokers: () => api.get('/api/settings/brokers'),
    getBrokerConfig: () => api.get('/api/settings/broker'),
    saveBrokerConfig: (data: { broker: string;[key: string]: string }) =>
        api.post('/api/settings/broker', data),
    disconnectBroker: (broker: string) => api.delete(`/api/settings/broker/${broker}`),
}