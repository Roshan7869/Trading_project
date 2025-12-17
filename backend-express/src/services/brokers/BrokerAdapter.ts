export interface MarketQuote {
    scriptToken: string;
    symbol: string;
    ltp: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: Date;
}

export interface PlaceOrderRequest {
    scriptToken: string;
    symbol: string;
    transactionType: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    orderType: string;
    productType: string;
}

export interface BrokerAdapter {
    login(credentials: any): Promise<{ accessToken: string; feedToken?: string }>;
    fetchMarketQuote(scriptToken: string, exchange: string): Promise<MarketQuote>;
    placeOrder(order: PlaceOrderRequest): Promise<string>; // Returns Order ID
    getHoldings(): Promise<any[]>;
    getPositions(): Promise<any[]>;
}
