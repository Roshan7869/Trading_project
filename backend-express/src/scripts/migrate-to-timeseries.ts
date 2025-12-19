/**
 * MongoDB Time Series Migration Script
 * Migrates existing MarketData to Time Series collection
 * 
 * Usage: npx ts-node src/scripts/migrate-to-timeseries.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/paper_trading';

async function migrate() {
    console.log('🚀 Starting Time Series Migration...');
    console.log(`📡 Connecting to: ${MONGO_URL.replace(/\/\/.*@/, '//***@')}`);

    try {
        await mongoose.connect(MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db!;

        // Check MongoDB version
        const adminDb = db.admin();
        const serverInfo = await adminDb.serverInfo();
        const version = serverInfo.version;
        console.log(`📊 MongoDB version: ${version}`);

        const majorVersion = parseInt(version.split('.')[0]);
        if (majorVersion < 5) {
            console.error('❌ MongoDB 5.0+ required for Time Series collections');
            console.error('   Please upgrade MongoDB or skip this migration');
            process.exit(1);
        }

        // Check if time series collection already exists
        const collections = await db.listCollections({ name: 'price_history_ts' }).toArray();

        if (collections.length > 0) {
            console.log('⚠️ Time Series collection already exists');
            console.log('   Skipping creation...');
        } else {
            // Create Time Series collection
            console.log('📦 Creating Time Series collection: price_history_ts');

            await db.createCollection('price_history_ts', {
                timeseries: {
                    timeField: 'timestamp',
                    metaField: 'symbol',
                    granularity: 'seconds'
                },
                expireAfterSeconds: 90 * 24 * 60 * 60 // 90 days
            });

            console.log('✅ Time Series collection created');
        }

        // Check if we have existing MarketData to migrate
        const marketDataCollection = db.collection('marketdatas');
        const count = await marketDataCollection.countDocuments();

        if (count > 0) {
            console.log(`📤 Migrating ${count} documents from MarketData...`);

            // Get all documents
            const cursor = marketDataCollection.find({});
            const priceHistoryCollection = db.collection('price_history_ts');

            let migrated = 0;
            const documents: any[] = [];

            await cursor.forEach((doc: any) => {
                documents.push({
                    timestamp: doc.updatedAt || doc.sourceTimestamp || new Date(),
                    symbol: doc.symbolName || doc.scriptToken,
                    metadata: {
                        exchange: doc.exchange || 'NSE'
                    },
                    price: doc.lastTradedPrice,
                    volume: doc.volume,
                    bid: doc.bid,
                    ask: doc.ask,
                    open: doc.dayOpen,
                    high: doc.dayHigh,
                    low: doc.dayLow,
                    close: doc.dayClose,
                    change: doc.dayChange
                });
            });

            if (documents.length > 0) {
                // Insert in batches of 1000
                const batchSize = 1000;
                for (let i = 0; i < documents.length; i += batchSize) {
                    const batch = documents.slice(i, i + batchSize);
                    await priceHistoryCollection.insertMany(batch);
                    migrated += batch.length;
                    console.log(`   Migrated ${migrated}/${documents.length} documents`);
                }
            }

            console.log(`✅ Migration complete: ${migrated} documents`);
        } else {
            console.log('ℹ️ No existing MarketData to migrate');
        }

        // Create indexes
        console.log('📇 Creating indexes...');
        const priceHistoryCollection = db.collection('price_history_ts');
        await priceHistoryCollection.createIndex({ symbol: 1, timestamp: -1 });
        console.log('✅ Indexes created');

        // Verify
        const finalCount = await priceHistoryCollection.countDocuments();
        console.log(`\n✨ Migration Summary:`);
        console.log(`   Collection: price_history_ts`);
        console.log(`   Documents: ${finalCount}`);
        console.log(`   Type: Time Series (MongoDB 5.0+)`);
        console.log(`   Expiry: 90 days`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run migration
migrate().catch(console.error);
