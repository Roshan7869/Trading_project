export const AVAILABLE_STOCKS = [
    { symbol: 'RELIANCE', name: 'Reliance Industries' },
    { symbol: 'TCS', name: 'Tata Consultancy Services' },
    { symbol: 'INFY', name: 'Infosys Limited' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank' },
    { symbol: 'ITC', name: 'ITC Limited' },
    { symbol: 'SBIN', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
    { symbol: 'LT', name: 'Larsen & Toubro' },
    { symbol: 'AXISBANK', name: 'Axis Bank' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors' },
    { symbol: 'WIPRO', name: 'Wipro Limited' },
    { symbol: 'ADANIENT', name: 'Adani Enterprises' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance' }
];

export const getStockSymbols = () => AVAILABLE_STOCKS.map(s => s.symbol);
export const getStockBySymbol = (symbol: string) => AVAILABLE_STOCKS.find(s => s.symbol === symbol);
