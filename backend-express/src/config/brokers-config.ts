export const BROKER_CONFIGS = {
    KOTAK_NEO: {
        displayName: 'Kotak Neo',
        baseURL: 'https://napi.kotaksecurities.com',
        endpoints: {
            login: '/api/v1/login',
            orders: '/api/v1/orders',
            positions: '/api/v1/positions',
            holdings: '/api/v1/holdings',
            quote: '/api/v1/market/quote'
        },
        auth: 'BASIC_TOTP',
        features: {
            websocket: false,
            bracket_orders: true,
            cover_orders: true,
            stop_loss: true
        },
        limits: {
            rate_limit: 1000,
            timeout: 30000
        }
    },

    ANGEL_ONE: {
        displayName: 'Angel One',
        baseURL: 'https://apiconnect.angelbroking.com',
        endpoints: {
            login: '/secure/login',
            orders: '/rest/secure/placeorder',
            positions: '/rest/secure/positions',
            holdings: '/rest/secure/holdings',
            quote: '/rest/secure/quote'
        },
        auth: 'JWT_TOTP',
        features: {
            websocket: true,
            bracket_orders: true,
            cover_orders: false,
            stop_loss: true
        },
        limits: {
            rate_limit: 300,
            timeout: 30000
        }
    },

    ZERODHA_KITE: {
        displayName: 'Zerodha Kite',
        baseURL: 'https://api.kite.trade',
        endpoints: {
            login: 'https://kite.zerodha.com/api/login',
            orders: '/orders/regular',
            positions: '/positions',
            holdings: '/portfolio/holdings',
            quote: '/quote'
        },
        auth: 'TOKEN_TOTP',
        features: {
            websocket: true,
            bracket_orders: true,
            cover_orders: true,
            stop_loss: true
        },
        limits: {
            rate_limit: 10000,
            timeout: 30000
        }
    }
};

export const UNIFIED_FEATURES = {
    // Features available across all brokers
    common: ['MARKET_ORDER', 'LIMIT_ORDER', 'POSITIONS', 'HOLDINGS', 'MARGIN'],

    // Broker-specific features
    broker_specific: {
        bracket_orders: ['KOTAK_NEO', 'ANGEL_ONE', 'ZERODHA_KITE'],
        cover_orders: ['KOTAK_NEO', 'ZERODHA_KITE'],
        websocket: ['ANGEL_ONE', 'ZERODHA_KITE'],
        crypto: ['ANGEL_ONE']
    }
};

export const ERROR_CODES = {
    'AUTH_FAILED': { message: 'Authentication failed', action: 'RECONNECT' },
    'INSUFFICIENT_MARGIN': { message: 'Insufficient margin', action: 'SHOW_MARGIN' },
    'INVALID_ORDER': { message: 'Invalid order parameters', action: 'VALIDATE' },
    'ORDER_REJECTED': { message: 'Order rejected by exchange', action: 'RETRY' }
};
