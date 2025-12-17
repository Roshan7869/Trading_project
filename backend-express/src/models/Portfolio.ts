import mongoose, { Schema, Document } from 'mongoose';

export interface IHolding {
    symbol: string;
    quantity: number;
    avgPrice: number;
    investedValue: number;
}

export interface IPortfolio extends Document {
    userId: string;
    holdings: IHolding[];
    totalInvestedValue: number;
    updatedAt: Date;
}

const HoldingSchema = new Schema({
    symbol: { type: String, required: true },
    quantity: { type: Number, required: true },
    avgPrice: { type: Number, required: true },
    investedValue: { type: Number, required: true }
}, { _id: false });

const PortfolioSchema: Schema = new Schema({
    userId: { type: String, required: true, unique: true },
    holdings: [HoldingSchema],
    totalInvestedValue: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);