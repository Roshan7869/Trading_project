import axios from 'axios';
import * as base64 from 'base-64';
import * as speakeasy from 'speakeasy';
import { IBrokerAdapter, OrderData, AuthResult } from './IBrokerAdapter';

export class KotakNeoAdapter extends IBrokerAdapter {
    private baseURL: string;

    constructor(config: any) {
        super(config);
        this.brokerName = 'KOTAK_NEO';
        this.baseURL = config.BASE_URL || 'https://napi.kotaksecurities.com';
    }

    async authenticate(): Promise<AuthResult> {
        try {
            const credentials = `${this.config.CONSUMER_KEY}:${this.config.CONSUMER_SECRET}`;
            const encodedCredentials = base64.encode(credentials);

            const totpToken = speakeasy.totp({
                secret: this.config.TOTP_SECRET,
                encoding: 'base32'
            });

            const response = await axios.post(
                `${this.baseURL}/api/v1/login`,
                {
                    userId: this.config.CLIENT_ID,
                    password: this.config.MPIN,
                    totpNumber: totpToken
                },
                {
                    headers: {
                        'Authorization': `Basic ${encodedCredentials}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const data = response.data as any;
            if (response.status === 200 && data.accessToken) {
                this.accessToken = data.accessToken;
                this.sessionId = data.sessionId;
                this.tokenExpiry = new Date(Date.now() + 3600000);

                return {
                    success: true,
                    broker: this.brokerName!,
                    accessToken: this.accessToken!,
                    expiresAt: this.tokenExpiry
                };
            }
            throw new Error('Unexpected response from login');
        } catch (error: any) {
            throw new Error(`Kotak Neo Authentication Failed: ${error.message}`);
        }
    }

    async placeOrder(orderData: OrderData): Promise<any> {
        const validation = this.validateOrder(orderData);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        try {
            await this.getValidToken();

            const payload = {
                orderType: orderData.orderType,
                price: orderData.price || 0,
                quantity: orderData.quantity,
                side: orderData.side,
                symbol: orderData.symbol,
                exchange: orderData.exchange,
                productCode: orderData.productCode || 'MIS',
                clientId: this.config.CLIENT_ID,
                disclosedQuantity: orderData.disclosedQuantity || 0,
                timeInForce: orderData.timeInForce || 'DAY'
            };

            const response = await axios.post(
                `${this.baseURL}/api/v1/orders/regular/place`,
                payload,
                {
                    headers: this.getHeaders(),
                    timeout: 30000
                }
            );

            const data = response.data as any;
            return {
                success: true,
                orderId: data.orderId,
                status: data.status,
                broker: this.brokerName,
                timestamp: new Date()
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async cancelOrder(orderId: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.post(
                `${this.baseURL}/api/v1/orders/${orderId}/cancel`,
                {},
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                orderId: data.orderId,
                status: data.status
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async modifyOrder(orderId: string, modifyData: Partial<OrderData>): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.put(
                `${this.baseURL}/api/v1/orders/${orderId}/modify`,
                {
                    orderId: orderId,
                    orderType: modifyData.orderType,
                    quantity: modifyData.quantity,
                    price: modifyData.price || 0,
                    timeInForce: modifyData.timeInForce || 'DAY'
                },
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return { success: true, orderId: data.orderId, status: data.status };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getOrderStatus(orderId: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/orders/${orderId}`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                orderId: data.orderId,
                status: data.status,
                executedQuantity: data.executedQuantity,
                averagePrice: data.averagePrice
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getAllOrders(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/orders`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                orders: data.orders || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getPositions(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/positions`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                positions: data.positions || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getHoldings(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/holdings`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                holdings: data.holdings || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getQuote(symbols: string[]): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/market/quote`,
                {
                    headers: this.getHeaders(),
                    params: { symbols: symbols.join(',') },
                    timeout: 30000
                }
            );

            const data = response.data as any;
            return {
                success: true,
                quotes: data.quotes || {}
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async searchInstruments(query: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/market/search`,
                {
                    headers: this.getHeaders(),
                    params: { query },
                    timeout: 30000
                }
            );

            const data = response.data as any;
            return {
                success: true,
                instruments: data.instruments || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getMargin(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/margin`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                availableMargin: data.availableMargin,
                usedMargin: data.usedMargin,
                totalMargin: data.totalMargin
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getBalance(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/api/v1/account/balance`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: true,
                balance: data.balance,
                broker: this.brokerName
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    isTokenValid(): boolean {
        return !!(this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry);
    }

    async getValidToken(): Promise<string> {
        if (!this.isTokenValid()) {
            await this.authenticate();
        }
        return this.accessToken!;
    }

    getHeaders(): any {
        return {
            'Authorization': this.accessToken,
            'Session-Id': this.sessionId,
            'Content-Type': 'application/json',
            'User-Agent': 'PaperTradingPlatform/1.0'
        };
    }

    validateOrder(orderData: OrderData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!['BUY', 'SELL'].includes(orderData.side)) {
            errors.push('Invalid side');
        }

        if (!['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT'].includes(orderData.orderType)) {
            errors.push('Invalid order type');
        }

        if (orderData.quantity < 1 || orderData.quantity > 10000) {
            errors.push('Invalid quantity');
        }

        if (orderData.orderType === 'LIMIT' && (!orderData.price || orderData.price <= 0)) {
            errors.push('Price required for LIMIT orders');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
