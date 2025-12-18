/**
 * Symbol mapper for trading platform.
 * Maps trading symbols to script tokens for Angel One API compatibility.
 * TypeScript version of Python symbol_mapper.py
 */

// Exchange Types
export const EXCHANGE_NSE = 1;
export const EXCHANGE_NFO = 2;
export const EXCHANGE_BSE = 3;

export interface SymbolInfo {
    token: string;
    exchange: number;
    tradingSymbol: string;
    name: string;
}

// Symbol Token Mapping for NSE Equity
export const SYMBOL_TOKEN_MAP: Record<string, SymbolInfo> = {
    'RELIANCE': {
        token: '2885',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'RELIANCE-EQ',
        name: 'Reliance Industries Ltd'
    },
    'TCS': {
        token: '11536',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'TCS-EQ',
        name: 'Tata Consultancy Services Ltd'
    },
    'INFY': {
        token: '1594',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'INFY-EQ',
        name: 'Infosys Ltd'
    },
    'HDFCBANK': {
        token: '1333',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'HDFCBANK-EQ',
        name: 'HDFC Bank Ltd'
    },
    'ICICIBANK': {
        token: '4963',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'ICICIBANK-EQ',
        name: 'ICICI Bank Ltd'
    },
    'ITC': {
        token: '1660',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'ITC-EQ',
        name: 'ITC Ltd'
    },
    'SBIN': {
        token: '3045',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'SBIN-EQ',
        name: 'State Bank of India'
    },
    'BHARTIARTL': {
        token: '10604',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'BHARTIARTL-EQ',
        name: 'Bharti Airtel Ltd'
    },
    'HINDUNILVR': {
        token: '1394',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'HINDUNILVR-EQ',
        name: 'Hindustan Unilever Ltd'
    },
    'LT': {
        token: '11483',
        exchange: EXCHANGE_NSE,
        tradingSymbol: 'LT-EQ',
        name: 'Larsen & Toubro Ltd'
    },
};

// Reverse mapping: Token ID -> Symbol
export const TOKEN_TO_SYMBOL: Record<string, string> = Object.entries(SYMBOL_TOKEN_MAP)
    .reduce((acc, [symbol, info]) => {
        acc[info.token] = symbol;
        return acc;
    }, {} as Record<string, string>);

/**
 * Get script token from symbol name
 */
export function getTokenFromSymbol(symbol: string): string | null {
    const info = SYMBOL_TOKEN_MAP[symbol.toUpperCase()];
    return info ? info.token : null;
}

/**
 * Get symbol name from token ID
 */
export function getSymbolFromToken(token: string): string | null {
    return TOKEN_TO_SYMBOL[token] || null;
}

/**
 * Get full symbol info
 */
export function getSymbolInfo(symbol: string): SymbolInfo | null {
    return SYMBOL_TOKEN_MAP[symbol.toUpperCase()] || null;
}

/**
 * Get all available symbols
 */
export function getAllSymbols(): string[] {
    return Object.keys(SYMBOL_TOKEN_MAP);
}

/**
 * Check if a symbol is valid/supported
 */
export function isValidSymbol(symbol: string): boolean {
    return symbol.toUpperCase() in SYMBOL_TOKEN_MAP;
}
