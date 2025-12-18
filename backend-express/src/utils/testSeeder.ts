/**
 * Test Data Seeder
 * Creates test user and account for testing without authentication
 */

import mongoose from 'mongoose';
import User from '../models/User';
import Account from '../models/Account';

// Valid MongoDB ObjectId format (24 hex characters) - must match auth.ts
const TEST_USER_ID = '000000000000000000000001';

export async function seedTestData() {
    console.log('🌱 Seeding test data...');

    try {
        // Check if test user exists (using a specific email)
        let testUser = await User.findOne({ email: 'test@example.com' });

        if (!testUser) {
            // Create test user with a fixed ObjectId for consistency
            testUser = new User({
                _id: new mongoose.Types.ObjectId(TEST_USER_ID),
                email: 'test@example.com',
                password: 'test-password-hash', // Dummy hash
                firstName: 'Test',
                lastName: 'User',
                name: 'Test User',
                status: 'ACTIVE',
                walletBalance: 100000
            });
            await testUser.save();
            console.log('✅ Test user created:', testUser.email);
        } else {
            console.log('✅ Test user already exists:', testUser.email);
        }

        // Check if test account exists
        let testAccount = await Account.findOne({ userId: testUser._id });

        if (!testAccount) {
            testAccount = new Account({
                userId: testUser._id,
                accountName: 'Test Trading Account',
                accountType: 'PAPER_TRADING',
                broker: 'ANGEL_ONE',
                initialCapital: 100000,
                currentCash: 100000,
                usedMargin: 0,
                availableMargin: 100000,
                totalInvested: 0,
                status: 'ACTIVE',
                performanceMetrics: {
                    realizedPnL: 0,
                    unrealizedPnL: 0,
                    totalTrades: 0,
                    winningTrades: 0,
                    losingTrades: 0
                }
            });
            await testAccount.save();
            console.log('✅ Test account created with ₹1,00,000 balance');
        } else {
            console.log('✅ Test account already exists with balance:', testAccount.currentCash);
        }

        // Store the actual MongoDB _id for use in routes
        process.env.TEST_USER_MONGO_ID = testUser._id.toString();
        process.env.TEST_ACCOUNT_ID = testAccount._id.toString();

        console.log('🌱 Test data seeding complete!');
        console.log('   User ID:', testUser._id.toString());
        console.log('   Account ID:', testAccount._id.toString());

        return { testUser, testAccount };

    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        throw error;
    }
}
