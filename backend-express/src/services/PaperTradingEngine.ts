import Order, { IOrder } from '../models/Order';
import Account from '../models/Account';
import Trade from '../models/Trade';
import { positionService } from './PositionService';
import { accountService } from './AccountService';
import { marketDataService } from './MarketDataService';
import Decimal from 'decimal.js';
import mongoose from 'mongoose';

export class PaperTradingEngine {
    private io: any;

    public setSocket(io: any) {
        this.io = io;
    }

    /**
     * Place an Order
     */
    async placeOrder(orderData: Partial<IOrder>): Promise<IOrder> {
        // 1. Basic Validation
        this.validateOrder(orderData);

        // 2. Funds Check
        const account = await Account.findById(orderData.accountId);
        if (!account) throw new Error('Account not found');

        // Fetch real-time price if market order
        let currentPrice = orderData.price || orderData.triggerPrice;
        if (!currentPrice && orderData.symbolName) {
            const marketTick = marketDataService.getPrice(orderData.symbolName);
            if (marketTick) {
                currentPrice = marketTick.price;
            } else {
                // FAIL SAFE: Never execute market orders without live data
                throw new Error(`Market data unavailable for ${orderData.symbolName}. Cannot execute MARKET order.`);
            }
        } else if (!currentPrice) {
            throw new Error('Price is required for execution');
        }

        const quantity = new Decimal(orderData.quantity || 0);
        const price = new Decimal(currentPrice);
        const requiredAmount = price.times(quantity);

        // Use Decimal for comparison
        if (orderData.transactionType === 'BUY') {
            const availableMargin = new Decimal(account.availableMargin);
            if (availableMargin.lessThan(requiredAmount)) {
                throw new Error(`Insufficient funds. Required: ${requiredAmount.toFixed(2)}, Available: ${availableMargin.toFixed(2)}`);
            }
        }

        // 3. Create Order Record
        const newOrder = new Order({
            ...orderData,
            status: 'PENDING',
            orderId: `ORD${Date.now()}`,
            executionDetails: {
                executedQuantity: 0
            }
        });

        await newOrder.save();

        if (this.io) {
            this.io.emit('order:updated', newOrder);
        }

        // 4. Try Execution (Simulate immediate execution for Market orders)
        if (orderData.orderType === 'MARKET') {
            await this.executeOrder(newOrder, currentPrice);
        }

        return newOrder;
    }

    /**
     * Validate Order Logic
     */
    private validateOrder(order: Partial<IOrder>) {
        if (!order.accountId) throw new Error('Account ID is required');
        if (!order.scriptToken) throw new Error('Script Token is required');
        if (!order.quantity || order.quantity <= 0) throw new Error('Invalid quantity');
        if (order.orderType === 'LIMIT' && !order.price) throw new Error('Price required for Limit order');
    }

    /**
     * Execute Order (Internal)
     */
    async executeOrder(order: IOrder, executionPrice: number) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Update Order Status
            order.status = 'EXECUTED';
            order.executionDetails = {
                executedQuantity: order.quantity,
                executedPrice: executionPrice,
                executedAt: new Date(),
                averagePrice: executionPrice,
                remainingQuantity: 0
            };
            await order.save({ session });

            const qty = new Decimal(order.quantity);
            const price = new Decimal(executionPrice);
            const grossValue = qty.times(price);
            const brokerage = new Decimal(20); // Mock brokerage
            const netValue = grossValue.plus(brokerage); // Simplified for calculation display

            // 2. Create Trade Record
            const trade = new Trade({
                accountId: order.accountId,
                tradeId: `TRD${Date.now()}`,
                orderId: order._id,
                scriptToken: order.scriptToken,
                symbolName: order.symbolName,
                exchange: order.exchange,
                quantity: order.quantity,
                transactionType: order.transactionType,
                executionPrice: executionPrice,
                executedAt: new Date(),
                grossValue: grossValue.toNumber(),
                charges: {
                    brokerage: 20,
                    stt: 0,
                    total: 20
                },
                netValue: netValue.toNumber()
            });
            await trade.save({ session });

            // 3. Update Position
            await positionService.updatePosition(
                order.accountId.toString(),
                order.scriptToken,
                order.symbolName || '',
                order.exchange || 'NSE',
                order.transactionType,
                order.quantity,
                executionPrice,
                trade._id.toString(),
                session
            );

            // 4. Update Account Balance
            const totalValue = grossValue.toNumber();
            if (order.transactionType === 'BUY') {
                await accountService.updateBalance(order.accountId.toString(), totalValue, 'DEBIT', session);
            } else {
                await accountService.updateBalance(order.accountId.toString(), totalValue, 'CREDIT', session);
            }

            await session.commitTransaction();

            // 5. Emit Event (outside transaction)
            if (this.io) {
                this.io.emit('order:updated', order);
                this.io.emit('trade:executed', trade);
            }

        } catch (error) {
            await session.abortTransaction();
            console.error('Transaction aborted:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process Pending Orders based on Market Tick
     */
    async processPendingOrders(symbolName: string, currentPrice: number) {
        // Find all PENDING orders for this symbol
        const pendingOrders = await Order.find({
            symbolName: symbolName,
            status: 'PENDING'
        });

        for (const order of pendingOrders) {
            try {
                let shouldExecute = false;

                if (order.orderType === 'LIMIT' && order.price) {
                    // Buy Limit: Execute if current price <= limit price
                    if (order.transactionType === 'BUY' && currentPrice <= order.price) {
                        shouldExecute = true;
                    }
                    // Sell Limit: Execute if current price >= limit price
                    else if (order.transactionType === 'SELL' && currentPrice >= order.price) {
                        shouldExecute = true;
                    }
                }

                if (shouldExecute) {
                    console.log(`⚡ Executing Pending Order ${order.orderId} for ${symbolName} @ ${currentPrice}`);
                    await this.executeOrder(order, currentPrice);
                }
            } catch (err) {
                console.error(`Failed to execute pending order ${order.orderId}:`, err);
            }
        }
    }
}

export const paperTradingEngine = new PaperTradingEngine();
