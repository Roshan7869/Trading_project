import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAccount extends Document {
    userId: Types.ObjectId;
    accountName: string;
    accountType: 'PAPER_TRADING' | 'DEMO';
    broker: 'ANGEL_ONE' | 'ZERODHA';
    brokerConnectionId?: Types.ObjectId;

    initialCapital: number;
    currentCash: number;
    usedMargin: number;
    availableMargin: number;
    totalInvested: number;

    performanceMetrics: {
        totalReturn?: number;
        totalReturnPercent?: number;
        realizedPnL: number;
        unrealizedPnL: number;
        grossProfit: number;
        grossLoss: number;

        maxDrawdown?: number;
        sharpeRatio?: number;

        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate?: number;

        lastCalculatedAt?: Date;
    };

    status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
    createdAt: Date;
    updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountName: { type: String, required: true },
    accountType: { type: String, enum: ['PAPER_TRADING', 'DEMO'], default: 'PAPER_TRADING' },

    broker: { type: String, enum: ['ANGEL_ONE', 'ZERODHA'], required: true },
    brokerConnectionId: { type: Schema.Types.ObjectId },

    initialCapital: { type: Number, required: true },
    currentCash: { type: Number, required: true },
    usedMargin: { type: Number, default: 0 },
    availableMargin: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },

    performanceMetrics: {
        totalReturn: { type: Number },
        totalReturnPercent: { type: Number },
        realizedPnL: { type: Number, default: 0 },
        unrealizedPnL: { type: Number, default: 0 },
        grossProfit: { type: Number, default: 0 },
        grossLoss: { type: Number, default: 0 },

        maxDrawdown: { type: Number },
        sharpeRatio: { type: Number },

        totalTrades: { type: Number, default: 0 },
        winningTrades: { type: Number, default: 0 },
        losingTrades: { type: Number, default: 0 },
        winRate: { type: Number },

        lastCalculatedAt: { type: Date }
    },

    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CLOSED'], default: 'ACTIVE' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
AccountSchema.index({ userId: 1 });
AccountSchema.index({ broker: 1 });
AccountSchema.index({ status: 1 });

export default mongoose.model<IAccount>('Account', AccountSchema);
