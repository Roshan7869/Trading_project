import mongoose, { Schema, Document } from 'mongoose';

export interface IBrokerConnection {
    broker: 'ANGEL_ONE' | 'KOTAK_NEO' | 'ZERODHA';

    // Common fields
    apiKey?: string;
    apiSecret?: string;      // Encrypted
    accessToken?: string;    // Encrypted
    refreshToken?: string;   // Encrypted
    tokenExpiresAt?: Date;
    isActive: boolean;
    connectedAt?: Date;
    lastSyncAt?: Date;

    // Angel One specific
    clientCode?: string;
    pin?: string;            // Encrypted
    totpSecret?: string;     // Encrypted

    // Kotak Neo specific
    consumerKey?: string;
    consumerSecret?: string; // Encrypted
    mobileNumber?: string;
    password?: string;       // Encrypted

    // Zerodha specific
    requestToken?: string;
    userId?: string;
}

export interface IUser extends Document {
    email: string;
    password?: string;
    firstName: string;
    lastName?: string;
    phone?: string;

    brokerConnections: IBrokerConnection[];

    preferences: {
        theme: 'light' | 'dark';
        notifications: {
            email: boolean;
            push: boolean;
            sms: boolean;
        };
        riskLevel?: 'conservative' | 'moderate' | 'aggressive';
        defaultTimeframe: '1min' | '5min' | '15min' | '60min' | 'daily';
        defaultBroker?: string;
    };

    status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
    createdAt: Date;
    lastLoginAt?: Date;

    // Legacy fields being kept for compatibility
    id?: string;
    clerkId?: string; // Clerk User ID
    name?: string;
    walletBalance?: number;
}

const BrokerConnectionSchema = new Schema({
    broker: { type: String, enum: ['ANGEL_ONE', 'KOTAK_NEO', 'ZERODHA'], required: true },

    // Common fields
    apiKey: { type: String },
    apiSecret: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    connectedAt: { type: Date },
    lastSyncAt: { type: Date },

    // Angel One specific
    clientCode: { type: String },
    pin: { type: String },
    totpSecret: { type: String },

    // Kotak Neo specific
    consumerKey: { type: String },
    consumerSecret: { type: String },
    mobileNumber: { type: String },
    password: { type: String },

    // Zerodha specific
    requestToken: { type: String },
    userId: { type: String }
});

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String },
    phone: { type: String },

    brokerConnections: [BrokerConnectionSchema],

    preferences: {
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        riskLevel: { type: String, enum: ['conservative', 'moderate', 'aggressive'] },
        defaultTimeframe: { type: String, enum: ['1min', '5min', '15min', '60min', 'daily'], default: '5min' },
        defaultBroker: { type: String }
    },

    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'], default: 'ACTIVE' },

    // Legacy support
    id: { type: String },
    clerkId: { type: String, unique: true, sparse: true }, // Sparse allows nulls for legacy users
    name: { type: String },
    walletBalance: { type: Number, default: 100000 },

    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);