import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrade extends Document {
    accountId: Types.ObjectId;
    tradeId: string;
    orderId: Types.ObjectId;

    scriptToken: string;
    symbolName?: string;
    exchange?: string;

    quantity: number;
    transactionType: 'BUY' | 'SELL';

    executionPrice: number;
    executedAt: Date;

    // For P&L tracking
    entryPrice?: number;
    exitPrice?: number;
    entryTime?: Date;
    exitTime?: Date;

    grossValue: number;
    charges: {
        brokerage: number;
        stt: number;
        total: number;
    };
    netValue: number;

    closedTrade?: {
        exitQuantity: number;
        exitPrice: number;
        exitTime: Date;
        pnl: number;
        pnlPercent: number;
        status: 'OPEN' | 'CLOSED';
    };

    duration?: number;
    strategy?: string;
    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}

const TradeSchema: Schema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    tradeId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },

    scriptToken: { type: String, required: true },
    symbolName: { type: String },
    exchange: { type: String },

    quantity: { type: Number, required: true },
    transactionType: { type: String, enum: ['BUY', 'SELL'], required: true },

    executionPrice: { type: Number, required: true },
    executedAt: { type: Date, default: Date.now },

    entryPrice: { type: Number },
    exitPrice: { type: Number },
    entryTime: { type: Date },
    exitTime: { type: Date },

    grossValue: { type: Number },
    charges: {
        brokerage: { type: Number },
        stt: { type: Number },
        total: { type: Number }
    },
    netValue: { type: Number },

    closedTrade: {
        exitQuantity: { type: Number },
        exitPrice: { type: Number },
        exitTime: { type: Date },
        pnl: { type: Number },
        pnlPercent: { type: Number },
        status: { type: String, enum: ['OPEN', 'CLOSED'] }
    },

    duration: { type: Number },
    strategy: { type: String },
    notes: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
TradeSchema.index({ accountId: 1, createdAt: -1 });
TradeSchema.index({ scriptToken: 1, executedAt: -1 });
TradeSchema.index({ tradeId: 1 }, { unique: true });

export default mongoose.model<ITrade>('Trade', TradeSchema);
