/**
 * OrderService - Bridges simple frontend order schema to PaperTradingEngine
 * Handles symbol mapping, account resolution, and price fetching
 */

import { paperTradingEngine } from './PaperTradingEngine';
import { assertAccountOwnership } from '../utils/assertOwnership';
import { accountService } from './AccountService';
import { marketDataService } from './MarketDataService';
import { getTokenFromSymbol, getSymbolInfo, isValidSymbol } from '../utils/symbolMapper';
import Account from '../models/Account';

export interface SimpleOrderRequest {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    message: string;
    order?: any;
    executionPrice?: number;
}

export class OrderService {

    /**
     * Place a simplified order from frontend
     * Automatically resolves account, maps symbol to token, and fetches current price
     */
    async placeSimpleOrder(userId: string, orderRequest: SimpleOrderRequest): Promise<OrderResult> {
        const { symbol, type, quantity, price } = orderRequest;

        // 1. Validate symbol
        if (!isValidSymbol(symbol)) {
            return {
                success: false,
                message: `Invalid symbol: ${symbol}. Supported symbols are: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, ITC, SBIN, BHARTIARTL, HINDUNILVR, LT`
            };
        }

        // 2. Validate quantity
        if (!quantity || quantity <= 0) {
            return {
                success: false,
                message: 'Quantity must be greater than 0'
            };
        }

        // 3. Get or create user's default account
        let account;
        try {
            const accounts = await accountService.getUserAccounts(userId);
            if (accounts.length === 0) {
                // Create default account for user
                account = await accountService.createAccount(userId, 'Default Account', 100000, 'ANGEL_ONE');
                console.log(`Created default account for user ${userId}`);
            } else {
                // Use first active account
                account = accounts.find(a => a.status === 'ACTIVE') || accounts[0];
            }

            // Verify ownership
            await assertAccountOwnership(userId, account._id.toString());

        } catch (error: any) {
            return {
                success: false,
                message: `Account error: ${error.message}`
            };
        }

        // 4. Get symbol info and token
        const symbolInfo = getSymbolInfo(symbol);
        const scriptToken = getTokenFromSymbol(symbol);

        if (!scriptToken || !symbolInfo) {
            return {
                success: false,
                message: `Could not resolve token for symbol: ${symbol}`
            };
        }

        // 5. Get current market price if not provided
        let executionPrice = price;
        if (!executionPrice) {
            const marketTick = marketDataService.getPrice(symbol.toUpperCase());
            if (marketTick) {
                executionPrice = marketTick.price;
            } else {
                return {
                    success: false,
                    message: `No market price available for ${symbol}. Please wait for market data or specify a price.`
                };
            }
        }

        // 6. Place order via PaperTradingEngine
        try {
            const order = await paperTradingEngine.placeOrder({
                accountId: account._id,
                scriptToken: scriptToken,
                symbolName: symbol.toUpperCase(),
                exchange: 'NSE',
                orderType: 'MARKET',
                quantity: quantity,
                price: executionPrice,
                transactionType: type,
                productType: 'CNC', // Cash and Carry for delivery
                validity: 'DAY'
            });

            return {
                success: true,
                orderId: order.orderId,
                message: `${type} order placed successfully for ${quantity} shares of ${symbol} at ₹${executionPrice?.toFixed(2)}`,
                order: order,
                executionPrice: executionPrice
            };

        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to place order'
            };
        }
    }

    /**
     * Get user's default account, creating one if needed
     */
    async getOrCreateDefaultAccount(userId: string) {
        const accounts = await accountService.getUserAccounts(userId);
        if (accounts.length === 0) {
            return accountService.createAccount(userId, 'Default Account', 100000, 'ANGEL_ONE');
        }
        return accounts.find(a => a.status === 'ACTIVE') || accounts[0];
    }
}

export const orderService = new OrderService();
