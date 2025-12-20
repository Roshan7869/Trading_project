export interface OrderData {
    symbol: string;
    exchange: string;
    quantity: number;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT';
    price?: number;
    triggerPrice?: number;
    productCode?: string; // MIS, CNC, etc.
    disclosedQuantity?: number;
    timeInForce?: string;
}

export interface AuthResult {
    success: boolean;
    broker: string;
    accessToken: string;
    expiresAt: Date;
}

export abstract class IBrokerAdapter {
    protected config: any;
    public brokerName: string | null = null;
    protected accessToken: string | null = null;
    protected sessionId: string | null = null;
    protected tokenExpiry: Date | null = null;

    constructor(config: any) {
        this.config = config;
    }

    // Authentication
    abstract authenticate(): Promise<AuthResult>;

    // Order Operations
    abstract placeOrder(orderData: OrderData): Promise<any>;
    abstract cancelOrder(orderId: string): Promise<any>;
    abstract modifyOrder(orderId: string, modifyData: Partial<OrderData>): Promise<any>;
    abstract getOrderStatus(orderId: string): Promise<any>;
    abstract getAllOrders(): Promise<any>;

    // Position & Holdings
    abstract getPositions(): Promise<any>;
    abstract getHoldings(): Promise<any>;

    // Market Data
    abstract getQuote(symbols: string[]): Promise<any>;
    abstract searchInstruments(query: string): Promise<any>;

    // Account Info
    abstract getMargin(): Promise<any>;
    abstract getBalance(): Promise<any>;

    // Utilities
    abstract isTokenValid(): boolean;
    abstract getValidToken(): Promise<string>;
    abstract getHeaders(): any;
    abstract validateOrder(orderData: OrderData): { valid: boolean; errors: string[] };
}
