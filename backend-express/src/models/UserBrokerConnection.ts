import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserBrokerConnection extends Document {
    userId: string;
    brokerName: 'KOTAK_NEO' | 'ANGEL_ONE' | 'ZERODHA_KITE';
    credentials: any; // Encrypted in production
    status: 'active' | 'inactive';
    connectedAt: Date;
    lastSyncAt?: Date;
}

const UserBrokerConnectionSchema: Schema = new Schema({
    userId: { type: String, required: true },
    brokerName: {
        type: String,
        enum: ['KOTAK_NEO', 'ANGEL_ONE', 'ZERODHA_KITE'],
        required: true
    },
    credentials: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    connectedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date }
});

UserBrokerConnectionSchema.index({ userId: 1, brokerName: 1 }, { unique: true });

export default mongoose.model<IUserBrokerConnection>('UserBrokerConnection', UserBrokerConnectionSchema);
