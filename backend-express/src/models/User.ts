import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    id: string;
    name: string;
    email: string;
    password: string;
    walletBalance: number;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 100000 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);