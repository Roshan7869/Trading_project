import Account, { IAccount } from '../models/Account';
import { Types } from 'mongoose';
import Decimal from 'decimal.js';

export class AccountService {

    /**
     * Create a new trading account for a user
     */
    async createAccount(userId: string, accountName: string, initialCapital: number = 100000, broker: 'ANGEL_ONE' | 'ZERODHA' = 'ANGEL_ONE'): Promise<IAccount> {

        // limit number of accounts per user if needed
        const count = await Account.countDocuments({ userId, status: 'ACTIVE' });
        if (count >= 5) {
            throw new Error('Maximum active accounts limit reached (5)');
        }

        const newAccount = new Account({
            userId,
            accountName,
            accountType: 'PAPER_TRADING',
            broker,
            initialCapital,
            currentCash: initialCapital,
            usedMargin: 0,
            availableMargin: initialCapital,
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

        await newAccount.save();
        return newAccount;
    }

    /**
     * Get specific account details
     */
    async getAccount(accountId: string, userId: string): Promise<IAccount> {
        const account = await Account.findOne({ _id: accountId, userId });
        if (!account) {
            throw new Error('Account not found or access denied');
        }
        return account;
    }

    /**
     * Get all accounts for a user
     */
    async getUserAccounts(userId: string): Promise<IAccount[]> {
        return Account.find({ userId }).sort({ createdAt: -1 });
    }

    /**
     * Update account balance (Atomic)
     */
    async updateBalance(accountId: string, amountChange: number, type: 'CREDIT' | 'DEBIT', session?: any): Promise<IAccount> {
        // Use Decimal to ensure precision before converting to JS number for Mongo
        // Note: MongoDB stores doubles by default, so we still rely on JS number precision at storage level
        // unless we switch to Decimal128. For now, we ensure the input delta is clean.

        const delta = new Decimal(amountChange).toNumber();

        if (type === 'DEBIT') {
            // Atomically check balance >= amount AND decrement
            const account = await Account.findOneAndUpdate(
                {
                    _id: accountId,
                    currentCash: { $gte: delta }
                },
                {
                    $inc: {
                        currentCash: -delta,
                        availableMargin: -delta // Assuming availableMargin moves 1:1 with cash for simple debits
                    }
                },
                { new: true, session }
            );

            if (!account) {
                // Determine if it was "Not Found" or "Insufficient Funds"
                const exists = await Account.exists({ _id: accountId });
                if (!exists) throw new Error('Account not found');
                throw new Error('Insufficient funds for transaction');
            }
            return account;

        } else {
            const account = await Account.findOneAndUpdate(
                { _id: accountId },
                {
                    $inc: {
                        currentCash: delta,
                        availableMargin: delta
                    }
                },
                { new: true, session }
            );

            if (!account) throw new Error('Account not found');
            return account;
        }
    }

    /**
     * Update margin usage
     */
    async updateMargin(accountId: string, usedMargin: number, totalInvested: number): Promise<void> {
        // We need to fetch current cash to calculate available margin correctly if we don't trust the delta
        // Ideally this should also be atomic if possible, but calculating "available = cash - used" requires referencing "cash" field
        // Aggregation pipeline updates (MongoDB 4.2+) allow referencing fields.

        await Account.findOneAndUpdate(
            { _id: accountId },
            [
                {
                    $set: {
                        usedMargin: usedMargin,
                        totalInvested: totalInvested,
                        // availableMargin = currentCash - usedMargin
                        availableMargin: { $subtract: ['$currentCash', usedMargin] }
                    }
                }
            ]
        );
    }
}

export const accountService = new AccountService();
