export const SUPPORTED_STOCKS = [
    { symbol: 'RELIANCE', token: '2885', name: 'Reliance Industries' },
    { symbol: 'TCS', token: '11536', name: 'Tata Consultancy Services' },
    { symbol: 'INFY', token: '1594', name: 'Infosys' },
    { symbol: 'HDFCBANK', token: '1333', name: 'HDFC Bank' },
    { symbol: 'ICICIBANK', token: '4963', name: 'ICICI Bank' },
    { symbol: 'ITC', token: '1660', name: 'ITC Limited' },
    { symbol: 'SBIN', token: '3045', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL', token: '10604', name: 'Bharti Airtel' },
    { symbol: 'HINDUNILVR', token: '1394', name: 'Hindustan Unilever' },
    { symbol: 'LT', token: '11483', name: 'Larsen & Toubro' }
];

export const getStockSymbols = () => SUPPORTED_STOCKS.map(s => s.symbol);
export const isValidSymbol = (symbol: string) => getStockSymbols().includes(symbol.toUpperCase());
