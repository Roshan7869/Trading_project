import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
    userId: string;
    symbols: string[];
    updatedAt: Date;
}

const WatchlistSchema: Schema = new Schema({
    userId: { type: String, required: true, unique: true },
    symbols: [{ type: String }],
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);