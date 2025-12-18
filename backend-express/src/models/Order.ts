import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrder extends Document {
    accountId: Types.ObjectId;
    orderId: string;

    scriptToken: string;
    symbolName?: string;
    exchange?: 'NSE' | 'BSE' | 'MCX' | 'NCDEX';

    orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT' | 'BRACKET' | 'COVER' | 'OCO';
    quantity: number;
    price?: number;
    triggerPrice?: number;

    transactionType: 'BUY' | 'SELL';
    productType: 'MIS' | 'CNC' | 'NRML';
    validity: 'DAY' | 'IOC' | 'GTC';

    status: 'PENDING' | 'PARTIALLY_EXECUTED' | 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

    executionDetails: {
        executedQuantity: number;
        executedPrice?: number;
        executedAt?: Date;
        averagePrice?: number;
        remainingQuantity?: number;
    };

    charges: {
        brokerage: number;
        stt: number;
        exchangeCharges: number;
        sebi: number;
        stampDuty: number;
        total: number;
    };

    rejectionReason?: string;
    notes?: string;
    tags?: string[];

    createdAt: Date;
    updatedAt: Date;

    // Legacy support
    userId?: string;
    totalAmount?: number;
    timestamp?: Date;
}

const OrderSchema: Schema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    orderId: { type: String, required: true, unique: true },

    scriptToken: { type: String, required: true },
    symbolName: { type: String },
    exchange: { type: String, enum: ['NSE', 'BSE', 'MCX', 'NCDEX'] },

    orderType: {
        type: String,
        enum: ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LIMIT', 'BRACKET', 'COVER', 'OCO'],
        required: true
    },

    quantity: { type: Number, required: true },
    price: { type: Number },
    triggerPrice: { type: Number },

    transactionType: { type: String, enum: ['BUY', 'SELL'], required: true },
    productType: { type: String, enum: ['MIS', 'CNC', 'NRML'], default: 'MIS' },
    validity: { type: String, enum: ['DAY', 'IOC', 'GTC'], default: 'DAY' },

    status: {
        type: String,
        enum: ['PENDING', 'PARTIALLY_EXECUTED', 'EXECUTED', 'CANCELLED', 'REJECTED', 'EXPIRED'],
        default: 'PENDING'
    },

    executionDetails: {
        executedQuantity: { type: Number, default: 0 },
        executedPrice: { type: Number },
        executedAt: { type: Date },
        averagePrice: { type: Number },
        remainingQuantity: { type: Number }
    },

    charges: {
        brokerage: { type: Number, default: 0 },
        stt: { type: Number, default: 0 },
        exchangeCharges: { type: Number, default: 0 },
        sebi: { type: Number, default: 0 },
        stampDuty: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    rejectionReason: { type: String },
    notes: { type: String },
    tags: [String],

    // Legacy fields for backward compatibility during migration
    userId: { type: String },
    totalAmount: { type: Number },
    timestamp: { type: Date },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
OrderSchema.index({ accountId: 1, createdAt: -1 });
// OrderSchema.index({ orderId: 1 }, { unique: true }); // Removed: Already defined in schema
OrderSchema.index({ status: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);