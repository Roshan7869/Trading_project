import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchlist extends Document {
    userId: Types.ObjectId;
    name: string;
    description?: string;
    isDefault: boolean;

    symbols: {
        scriptToken: string;
        symbolName: string;
        exchange: string;

        currentPrice?: number;
        change?: number;
        changePercent?: number;

        alerts: {
            type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE';
            triggerValue: number;
            isActive: boolean;
            triggered: boolean;
            createdAt: Date;
        }[];

        addedAt: Date;
    }[];

    createdAt: Date;
    updatedAt: Date;
}

const WatchlistSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },

    symbols: [{
        scriptToken: { type: String, required: true },
        symbolName: { type: String },
        exchange: { type: String },

        currentPrice: { type: Number },
        change: { type: Number },
        changePercent: { type: Number },

        alerts: [{
            type: { type: String, enum: ['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE'] },
            triggerValue: { type: Number },
            isActive: { type: Boolean, default: true },
            triggered: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now }
        }],

        addedAt: { type: Date, default: Date.now }
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
WatchlistSchema.index({ userId: 1 });
WatchlistSchema.index({ userId: 1, isDefault: 1 });

export default mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);