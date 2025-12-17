import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
    id: string;
    userId: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalAmount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    timestamp: Date;
}

const OrderSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    timestamp: { type: Date, default: Date.now }
});

OrderSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);