import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPosition extends Document {
    accountId: Types.ObjectId;

    scriptToken: string;
    symbolName?: string;
    exchange?: string;

    quantity: number;

    avgBuyPrice: number;
    avgSellPrice: number;
    currentPrice: number;
    lastPriceUpdateAt?: Date;

    investedAmount: number;
    currentValue: number;

    unrealizedPnL: number;
    unrealizedPnLPercent: number;

    totalBuyQuantity: number;
    totalSellQuantity: number;
    totalBuyValue: number;
    totalSellValue: number;

    totalCharges: number;

    status: 'OPEN' | 'CLOSED';

    tradeIds: Types.ObjectId[];

    openedAt: Date;
    closedAt?: Date;
    updatedAt: Date;

    // Legacy mapping
    userId?: string;
    type?: string;
    averagePrice?: number;
}

const PositionSchema: Schema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },

    scriptToken: { type: String, required: true },
    symbolName: { type: String },
    exchange: { type: String },

    quantity: { type: Number, required: true },

    avgBuyPrice: { type: Number, default: 0 },
    avgSellPrice: { type: Number, default: 0 },
    currentPrice: { type: Number, default: 0 },
    lastPriceUpdateAt: { type: Date },

    investedAmount: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },

    unrealizedPnL: { type: Number, default: 0 },
    unrealizedPnLPercent: { type: Number, default: 0 },

    totalBuyQuantity: { type: Number, default: 0 },
    totalSellQuantity: { type: Number, default: 0 },
    totalBuyValue: { type: Number, default: 0 },
    totalSellValue: { type: Number, default: 0 },

    totalCharges: { type: Number, default: 0 },

    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },

    tradeIds: [{ type: Schema.Types.ObjectId, ref: 'Trade' }],

    // Legacy support
    userId: { type: String },
    type: { type: String },
    averagePrice: { type: Number },

    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
PositionSchema.index({ accountId: 1, status: 1 });
PositionSchema.index({ scriptToken: 1 });

export default mongoose.model<IPosition>('Position', PositionSchema);
