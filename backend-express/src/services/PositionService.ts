import Position, { IPosition } from '../models/Position';
import { Types } from 'mongoose';
import { assertAccountOwnership } from '../utils/assertOwnership';
import mongoose from 'mongoose';

export class PositionService {

    /**
     * Update or Create Position based on a new trade
     */
    async updatePosition(
        accountId: string,
        scriptToken: string,
        symbolName: string,
        exchange: string,
        transactionType: 'BUY' | 'SELL',
        quantity: number,
        executionPrice: number,
        tradeId: string,
        session?: mongoose.ClientSession
    ): Promise<void> {

        // Find existing open position
        let position = await Position.findOne({
            accountId,
            scriptToken,
            status: 'OPEN'
        });

        if (!position) {
            // New Position (only if BUY or Short SELL - simplified to Buy for now)
            if (transactionType === 'SELL') {
                // For now, assuming we can only short if we allow it, but basic logic usually implies closing if no position exists (or it's a short open)
                // Keeping simple: Open new position
            }

            position = new Position({
                accountId,
                scriptToken,
                symbolName,
                exchange,
                quantity: transactionType === 'BUY' ? quantity : -quantity,
                avgBuyPrice: transactionType === 'BUY' ? executionPrice : 0,
                avgSellPrice: transactionType === 'SELL' ? executionPrice : 0,
                totalBuyQuantity: transactionType === 'BUY' ? quantity : 0,
                totalSellQuantity: transactionType === 'SELL' ? quantity : 0,
                totalBuyValue: transactionType === 'BUY' ? (quantity * executionPrice) : 0,
                totalSellValue: transactionType === 'SELL' ? (quantity * executionPrice) : 0,
                currentPrice: executionPrice,
                investedAmount: transactionType === 'BUY' ? (quantity * executionPrice) : 0,
                status: 'OPEN',
                tradeIds: [tradeId] // this might need casting to ObjectId if passing string
            });
        } else {
            // Update Existing Position
            if (transactionType === 'BUY') {
                if (position.quantity >= 0) {
                    // Adding to long position
                    const previousValue = position.quantity * position.avgBuyPrice;
                    const newValue = quantity * executionPrice;
                    position.quantity += quantity;
                    position.avgBuyPrice = (previousValue + newValue) / position.quantity;
                    position.totalBuyQuantity += quantity;
                    position.totalBuyValue += newValue;
                } else {
                    // Covering short position
                    // Complex logic for short covering... simplified:
                    position.quantity += quantity;
                    position.totalBuyQuantity += quantity;
                    position.totalBuyValue += (quantity * executionPrice);
                }
            } else {
                // SELL
                if (position.quantity > 0) {
                    // Selling long position
                    position.quantity -= quantity;
                    position.totalSellQuantity += quantity;
                    position.totalSellValue += (quantity * executionPrice);
                } else {
                    // Adding to short position
                    const previousValue = Math.abs(position.quantity) * position.avgSellPrice;
                    const newValue = quantity * executionPrice;
                    position.quantity -= quantity;
                    position.avgSellPrice = (previousValue + newValue) / Math.abs(position.quantity);
                    position.totalSellQuantity += quantity;
                    position.totalSellValue += newValue;
                }
            }

            // Check if closed
            if (position.quantity === 0) {
                position.status = 'CLOSED';
                position.closedAt = new Date();
            }

            position.tradeIds.push(new Types.ObjectId(tradeId));
        }

        // Update real-time metrics
        position.currentPrice = executionPrice;
        position.currentValue = Math.abs(position.quantity) * executionPrice;

        // Simplified PnL for Long: (Current - AvgBuy) * Qty
        if (position.quantity > 0) {
            position.investedAmount = position.quantity * position.avgBuyPrice;
            position.unrealizedPnL = position.currentValue - position.investedAmount;
        } else {
            // Short
            position.investedAmount = Math.abs(position.quantity) * position.avgSellPrice;
            position.unrealizedPnL = position.investedAmount - position.currentValue;
        }

        position.unrealizedPnLPercent = position.investedAmount > 0 ? (position.unrealizedPnL / position.investedAmount) * 100 : 0;

        await position.save();
    }

    /**
     * Get Open Positions with ownership check
     */
    async getOpenPositions(userId: string, accountId: string): Promise<IPosition[]> {
        await assertAccountOwnership(userId, accountId);
        return Position.find({ accountId, status: 'OPEN' });
    }
}

export const positionService = new PositionService();
