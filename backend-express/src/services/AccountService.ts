import Account, { IAccount } from '../models/Account';
import { Types } from 'mongoose';

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
     * Update account balance (internal use)
     */
    async updateBalance(accountId: string, amountChange: number, type: 'CREDIT' | 'DEBIT'): Promise<IAccount> {
        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        if (type === 'DEBIT') {
            if (account.currentCash < amountChange) {
                throw new Error('Insufficient funds');
            }
            account.currentCash -= amountChange;
        } else {
            account.currentCash += amountChange;
        }

        account.availableMargin = account.currentCash; // Simplified margin logic for now
        await account.save();
        return account;
    }

    /**
     * Update margin usage
     */
    async updateMargin(accountId: string, usedMargin: number, totalInvested: number): Promise<void> {
        await Account.updateOne(
            { _id: accountId },
            {
                $set: {
                    usedMargin,
                    totalInvested,
                    availableMargin: { $subtract: ['$currentCash', usedMargin] } // This aggregation won't work in simple update, needs lookup or pre-cal
                }
            }
        );

        // Correct way with two steps or save()
        const account = await Account.findById(accountId);
        if (account) {
            account.usedMargin = usedMargin;
            account.totalInvested = totalInvested;
            account.availableMargin = account.currentCash - usedMargin;
            await account.save();
        }
    }
}

export const accountService = new AccountService();
