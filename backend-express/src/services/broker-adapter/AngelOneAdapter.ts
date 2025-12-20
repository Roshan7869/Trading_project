import axios from 'axios';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { IBrokerAdapter, OrderData, AuthResult } from './IBrokerAdapter';

export class AngelOneAdapter extends IBrokerAdapter {
    private baseURL: string = 'https://api.angelbroking.com';

    constructor(config: any) {
        super(config);
        this.brokerName = 'ANGEL_ONE';
    }

    private _generateAuthHash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async authenticate(): Promise<AuthResult> {
        try {
            const totpToken = speakeasy.totp({
                secret: this.config.TOTP_SECRET,
                encoding: 'base32'
            });

            const response1 = await axios.post(
                `${this.baseURL}/secure/login`,
                {
                    clientcode: this.config.CLIENT_CODE,
                    password: this.config.API_PASSWORD,
                    totp: totpToken
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.BROKER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const data1 = response1.data as any;
            if (data1.status === 1 && data1.data.jwtToken) {
                this.accessToken = data1.data.jwtToken;
                this.sessionId = data1.data.sessionID;
                this.tokenExpiry = new Date(Date.now() + 3600000);

                return {
                    success: true,
                    broker: this.brokerName!,
                    accessToken: this.accessToken!,
                    expiresAt: this.tokenExpiry
                };
            }
            throw new Error(data1.message || 'Angel One Authentication Failed');
        } catch (error: any) {
            throw new Error(`Angel One Authentication Failed: ${error.message}`);
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
                mode: 'FULL',
                exchangetokens: 'null',
                ordertype: orderData.orderType === 'MARKET' ? 'MKT' : 'LIMIT',
                quantity: orderData.quantity.toString(),
                price: orderData.price ? orderData.price.toString() : '0',
                product: orderData.productCode || 'MIS',
                varietytype: 'REGULAR',
                tradingsymbol: orderData.symbol,
                exchange: orderData.exchange,
                orderside: orderData.side,
                clientcode: this.config.CLIENT_CODE
            };

            const response = await axios.post(
                `${this.baseURL}/rest/secure/placeorder`,
                payload,
                {
                    headers: this.getHeaders(),
                    timeout: 30000
                }
            );

            const data = response.data as any;
            if (data.status === 1) {
                return {
                    success: true,
                    orderId: data.data.orderid,
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

            const response = await axios.post(
                `${this.baseURL}/rest/secure/cancelorder`,
                {
                    orderid: orderId,
                    clientcode: this.config.CLIENT_CODE
                },
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
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

            const response = await axios.post(
                `${this.baseURL}/rest/secure/modifyorder`,
                {
                    orderid: orderId,
                    ordertype: modifyData.orderType === 'MARKET' ? 'MKT' : 'LIMIT',
                    quantity: modifyData.quantity?.toString(),
                    price: modifyData.price ? modifyData.price.toString() : '0',
                    clientcode: this.config.CLIENT_CODE
                },
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
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
                `${this.baseURL}/rest/secure/orderbook`,
                {
                    headers: this.getHeaders(),
                    timeout: 30000
                }
            );

            const data = response.data as any;
            if (data.status === 1 && data.data) {
                const order = data.data.find((o: any) => o.orderid === orderId);
                return {
                    success: !!order,
                    orderId: order?.orderid,
                    status: order?.orderstatus,
                    executedQuantity: order?.filledshares,
                    averagePrice: order?.averageprice
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
                `${this.baseURL}/rest/secure/orderbook`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
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
                `${this.baseURL}/rest/secure/positions`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
                positions: data.data || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getHoldings(): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.get(
                `${this.baseURL}/rest/secure/holdings`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
                holdings: data.data || []
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async getQuote(symbols: string[]): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.post(
                `${this.baseURL}/rest/secure/quote`,
                {
                    mode: 'LTP',
                    exchangetokens: symbols.map(s => ({ exchange: 'NSE', token: s }))
                },
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
                quotes: data.data || {}
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async searchInstruments(query: string): Promise<any> {
        try {
            await this.getValidToken();

            const response = await axios.post(
                `${this.baseURL}/rest/secure/search`,
                { searchsymbol: query },
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
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
                `${this.baseURL}/rest/secure/limits`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            if (data.status === 1 && data.data) {
                const innerData = data.data;
                return {
                    success: true,
                    availableMargin: parseFloat(innerData.availablecash),
                    usedMargin: parseFloat(innerData.usedmargin),
                    totalMargin: parseFloat(innerData.totalfundslimit)
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
                `${this.baseURL}/rest/secure/limits`,
                { headers: this.getHeaders(), timeout: 30000 }
            );

            const data = response.data as any;
            return {
                success: data.status === 1,
                balance: data.data?.availablecash || 0,
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
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': '00:00:00:00:00:00'
        };
    }

    validateOrder(orderData: OrderData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!['BUY', 'SELL'].includes(orderData.side)) {
            errors.push('Invalid side');
        }

        if (!['MARKET', 'LIMIT'].includes(orderData.orderType)) {
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
