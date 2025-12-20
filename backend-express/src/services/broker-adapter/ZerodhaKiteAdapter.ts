import axios from 'axios';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { IBrokerAdapter, OrderData, AuthResult } from './IBrokerAdapter';

export class ZerodhaKiteAdapter extends IBrokerAdapter {
    private baseURL: string = 'https://api.kite.trade';
    private loginURL: string = 'https://kite.zerodha.com/api/login';

    constructor(config: any) {
        super(config);
        this.brokerName = 'ZERODHA_KITE';
    }

    async authenticate(): Promise<AuthResult> {
        try {
            const response1 = await axios.post(
                `${this.loginURL}`,
                {
                    user_id: this.config.CLIENT_ID,
                    password: this.config.PASSWORD
                },
                { timeout: 30000 }
            );

            const data1 = response1.data as any;
            if (!data1.request_token) {
                throw new Error('Failed to get request token');
            }

            const requestToken = data1.request_token;

            const totpToken = speakeasy.totp({
                secret: this.config.TOTP_SECRET,
                encoding: 'base32'
            });

            const checksum = crypto
                .createHash('sha256')
                .update(this.config.API_KEY + requestToken + this.config.API_SECRET)
                .digest('hex');

            const response2 = await axios.post(
                `${this.baseURL}/session/token`,
                {
                    api_key: this.config.API_KEY,
                    request_token: requestToken,
                    checksum: checksum,
                    user_session: this.config.CLIENT_ID,
                    twofa: totpToken
                },
                { timeout: 30000 }
            );

            const data2 = response2.data as any;
            if (data2.status === 'success' && data2.data.access_token) {
                this.accessToken = data2.data.access_token;
                this.sessionId = data2.data.public_token;
                this.tokenExpiry = new Date(Date.now() + 86400000); // 24 hours

                return {
                    success: true,
                    broker: this.brokerName!,
                    accessToken: this.accessToken!,
                    expiresAt: this.tokenExpiry
                };
            }
            throw new Error(data2.message || 'Zerodha Authentication Failed');
        } catch (error: any) {
            throw new Error(`Zerodha Kite Authentication Failed: ${error.message}`);
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
                variety: 'regular',
                exchange: orderData.exchange,
                tradingsymbol: orderData.symbol,
                transaction_type: orderData.side,
                order_type: orderData.orderType === 'MARKET' ? 'MKT' : 'LIMIT',
                quantity: orderData.quantity,
                price: orderData.price || undefined,
                product: orderData.productCode || 'MIS',
                validity: 'DAY',
                disclosed_quantity: orderData.disclosedQuantity || 0
            };

            const response = await axios.post(
                `${this.baseURL}/orders/regular`,
                payload,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            if (data.status === 'success' && data.data.order_id) {
                return {
                    success: true,
                    orderId: data.data.order_id,
                    status: 'PENDING',
                    broker: this.brokerName,
                    timestamp: new Date()
                };
            }

            return { success: false, error: data.message };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async cancelOrder(orderId: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.delete(
                `${this.baseURL}/orders/regular/${orderId}`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                orderId: orderId,
                status: 'CANCELLED'
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async modifyOrder(orderId: string, modifyData: Partial<OrderData>): Promise<any> {
        try {
            await this.getValidToken();

            const payload = {
                variety: 'regular',
                order_type: modifyData.orderType === 'MARKET' ? 'MKT' : 'LIMIT',
                quantity: modifyData.quantity,
                price: modifyData.price || undefined,
                validity: 'DAY'
            };

            const response = await axios.put(
                `${this.baseURL}/orders/regular/${orderId}`,
                payload,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                orderId: orderId,
                status: 'MODIFIED'
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getOrderStatus(orderId: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/orders`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            if (data.status === 'success' && data.data) {
                const order = data.data.find((o: any) => o.order_id === orderId);
                return {
                    success: !!order,
                    orderId: order?.order_id,
                    status: order?.status,
                    executedQuantity: order?.filled_quantity,
                    averagePrice: order?.average_price
                };
            }
            return { success: false, error: 'Order not found' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getAllOrders(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/orders`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                orders: data.data || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getPositions(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/positions`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            if (data.status === 'success' && data.data) {
                return {
                    success: true,
                    positions: data.data.net || []
                };
            }
            return { success: false, error: 'Failed to fetch positions' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getHoldings(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/portfolio/holdings`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                holdings: data.data || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getQuote(symbols: string[]): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/quote`,
                {
                    headers: this.getHeaders(),
                    params: { i: symbols.map(s => `NSE:${s}`).join(',') },
                    timeout: 30000
                }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                quotes: data.data || {}
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async searchInstruments(query: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/instruments/search`,
                {
                    headers: this.getHeaders(),
                    params: { q: query },
                    timeout: 30000
                }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                instruments: data.data || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getMargin(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/user/margins`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            if (data.status === 'success' && data.data) {
                const margin = data.data.equity || {};
                return {
                    success: true,
                    availableMargin: margin.available || 0,
                    usedMargin: margin.used || 0,
                    totalMargin: margin.cash || 0
                };
            }
            return { success: false, error: 'Failed to fetch margin' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getBalance(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/user/margins`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 'success',
                balance: data.data?.equity?.cash || 0,
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
            'Authorization': `token ${this.config.API_KEY}:${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
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

        if (orderData.quantity < 1) {
            errors.push('Invalid quantity');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
