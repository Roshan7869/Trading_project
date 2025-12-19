import mongoose, { Schema, Document } from 'mongoose';

/**
 * Price History - Time Series Collection
 * Stores historical tick data with optimized time-series storage
 * 
 * Requirements: MongoDB 5.0+
 * Benefits: 
 * - 70-80% storage reduction
 * - 100x faster aggregation queries
 * - Automatic data bucketing
 */

export interface IPriceHistory extends Document {
    timestamp: Date;
    symbol: string;
    metadata: {
        exchange: string;
        sector?: string;
    };
    price: number;
    volume?: number;
    bid?: number;
    ask?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    change?: number;
}

const PriceHistorySchema: Schema = new Schema({
    timestamp: {
        type: Date,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    metadata: {
        exchange: { type: String, default: 'NSE' },
        sector: { type: String }
    },
    price: {
        type: Number,
        required: true
    },
    volume: { type: Number },
    bid: { type: Number },
    ask: { type: Number },
    open: { type: Number },
    high: { type: Number },
    low: { type: Number },
    close: { type: Number },
    change: { type: Number }
}, {
    // TIME SERIES OPTIONS (MongoDB 5.0+)
    timeseries: {
        timeField: 'timestamp',
        metaField: 'symbol',
        granularity: 'seconds'
    },
    // Auto-expire old data after 90 days
    expireAfterSeconds: 90 * 24 * 60 * 60
});

// Note: Time series collections automatically create optimized indexes
// Additional indexes for common queries
PriceHistorySchema.index({ symbol: 1, timestamp: -1 });

/**
 * Static method to get OHLC candles
 */
PriceHistorySchema.statics.getOHLC = async function (
    symbol: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 1
) {
    return this.aggregate([
        {
            $match: {
                symbol: symbol,
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateTrunc: {
                        date: '$timestamp',
                        unit: 'minute',
                        binSize: intervalMinutes
                    }
                },
                open: { $first: '$price' },
                high: { $max: '$price' },
                low: { $min: '$price' },
                close: { $last: '$price' },
                volume: { $sum: '$volume' }
            }
        },
        {
            $sort: { _id: 1 }
        },
        {
            $project: {
                _id: 0,
                timestamp: '$_id',
                open: 1,
                high: 1,
                low: 1,
                close: 1,
                volume: 1
            }
        }
    ]);
};

/**
 * Static method to get latest price for a symbol
 */
PriceHistorySchema.statics.getLatestPrice = async function (symbol: string) {
    const result = await this.findOne({ symbol }).sort({ timestamp: -1 }).lean();
    return result?.price || null;
};

/**
 * Static method to insert tick (convenience wrapper)
 */
PriceHistorySchema.statics.insertTick = async function (
    symbol: string,
    price: number,
    exchange: string = 'NSE',
    additionalData: Partial<IPriceHistory> = {}
) {
    return this.create({
        timestamp: new Date(),
        symbol: symbol.toUpperCase(),
        metadata: { exchange },
        price,
        ...additionalData
    });
};

const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema, 'price_history_ts');

export default PriceHistory;
