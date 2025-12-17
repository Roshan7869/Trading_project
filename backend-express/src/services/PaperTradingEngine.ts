import Order, { IOrder } from '../models/Order';
import Account from '../models/Account';
import Trade from '../models/Trade';
import { positionService } from './PositionService';
import { accountService } from './AccountService';
import { marketDataService } from './MarketDataService';

export class PaperTradingEngine {

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
                // If no tick in cache, use a default but log it
                console.warn(`No market data found for ${orderData.symbolName}, using placeholder`);
                currentPrice = 1000;
            }
        } else if (!currentPrice) {
            currentPrice = 1000;
        }

        const requiredAmount = currentPrice * (orderData.quantity || 0);

        if (orderData.transactionType === 'BUY' && account.availableMargin < requiredAmount) {
            throw new Error(`Insufficient funds. Required: ${requiredAmount}, Available: ${account.availableMargin}`);
        }

        // 3. Create Order Record
        const newOrder = new Order({
            ...orderData,
            status: 'PENDING',
            orderId: `ORD${Date.now()}`, // Simple ID generation
            executionDetails: {
                executedQuantity: 0
            }
        });

        await newOrder.save();

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
        // 1. Update Order Status
        order.status = 'EXECUTED';
        order.executionDetails = {
            executedQuantity: order.quantity,
            executedPrice: executionPrice,
            executedAt: new Date(),
            averagePrice: executionPrice,
            remainingQuantity: 0
        };
        await order.save();

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
            grossValue: order.quantity * executionPrice,
            charges: { // Mock charges
                brokerage: 20,
                stt: 0,
                total: 20
            },
            netValue: (order.quantity * executionPrice) + 20 // + or - depending on buy/sell
        });
        await trade.save();

        // 3. Update Position
        await positionService.updatePosition(
            order.accountId.toString(),
            order.scriptToken,
            order.symbolName || '',
            order.exchange || 'NSE',
            order.transactionType,
            order.quantity,
            executionPrice,
            trade._id.toString()
        );

        // 4. Update Account Balance
        const totalValue = order.quantity * executionPrice;
        if (order.transactionType === 'BUY') {
            await accountService.updateBalance(order.accountId.toString(), totalValue, 'DEBIT');
        } else {
            await accountService.updateBalance(order.accountId.toString(), totalValue, 'CREDIT');
        }
    }
}

export const paperTradingEngine = new PaperTradingEngine();
