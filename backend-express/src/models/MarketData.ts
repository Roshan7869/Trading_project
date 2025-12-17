import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketData extends Document {
    scriptToken: string;
    symbolName?: string;
    exchange?: string;

    lastTradedPrice: number;
    bid?: number;
    ask?: number;

    volume?: number;
    openInterest?: number;

    dayOpen?: number;
    dayHigh?: number;
    dayLow?: number;
    dayClose?: number;
    dayChange?: number;
    dayChangePercent?: number;

    weekHigh52?: number;
    weekLow52?: number;

    updatedAt: Date;
    sourceTimestamp?: Date;
}

const MarketDataSchema: Schema = new Schema({
    scriptToken: { type: String, required: true, unique: true },
    symbolName: { type: String },
    exchange: { type: String },

    lastTradedPrice: { type: Number },
    bid: { type: Number },
    ask: { type: Number },

    volume: { type: Number },
    openInterest: { type: Number },

    dayOpen: { type: Number },
    dayHigh: { type: Number },
    dayLow: { type: Number },
    dayClose: { type: Number },
    dayChange: { type: Number },
    dayChangePercent: { type: Number },

    weekHigh52: { type: Number },
    weekLow52: { type: Number },

    updatedAt: { type: Date, default: Date.now },
    sourceTimestamp: { type: Date }
});

// Indexes
MarketDataSchema.index({ updatedAt: -1 });
MarketDataSchema.index({ exchange: 1 });

export default mongoose.model<IMarketData>('MarketData', MarketDataSchema);
