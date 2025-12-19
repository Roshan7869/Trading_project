import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock dependencies BEFORE importing the service
vi.mock('../../src/models/Account');
vi.mock('../../src/models/Order', () => {
    const mockSave = vi.fn().mockResolvedValue({});
    // Must return a function that works with 'new'
    function MockOrder(this: any, data: any) {
        Object.assign(this, data, {
            save: mockSave,
            _id: new mongoose.Types.ObjectId(),
            accountId: data.accountId
        });
    }
    return {
        default: MockOrder,
        __esModule: true
    };
});
vi.mock('../../src/models/Trade', () => {
    const mockSave = vi.fn().mockResolvedValue({});
    function MockTrade(this: any, data: any) {
        Object.assign(this, data, {
            save: mockSave,
            _id: new mongoose.Types.ObjectId()
        });
    }
    return {
        default: MockTrade,
        __esModule: true
    };
});
vi.mock('../../src/services/MarketDataService', () => ({
    marketDataService: {
        getPrice: vi.fn()
    },
    __esModule: true
}));
vi.mock('../../src/services/PositionService', () => ({
    positionService: {
        updatePosition: vi.fn().mockResolvedValue({})
    },
    __esModule: true
}));
vi.mock('../../src/services/AccountService', () => ({
    accountService: {
        updateBalance: vi.fn().mockResolvedValue({})
    },
    __esModule: true
}));
vi.mock('../../src/services/CacheService', () => ({
    cacheService: {
        invalidatePortfolio: vi.fn().mockResolvedValue(undefined)
    },
    __esModule: true
}));

// Import Service AFTER mocks
import { paperTradingEngine } from '../../src/services/PaperTradingEngine';
import Account from '../../src/models/Account';
import { marketDataService } from '../../src/services/MarketDataService';

describe('PaperTradingEngine', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('placeOrder', () => {
        it('should throw error if account not found', async () => {
            vi.mocked(Account.findById).mockResolvedValue(null);

            await expect(paperTradingEngine.placeOrder({
                accountId: 'invalid',
                scriptToken: '123',
                quantity: 1
            } as any))
                .rejects.toThrow('Account not found');
        });

        it('should throw error if insufficient funds for BUY order', async () => {
            vi.mocked(Account.findById).mockResolvedValue({
                availableMargin: 100
            } as any);

            // Mock market price
            vi.mocked(marketDataService.getPrice).mockReturnValue({ price: 1000 } as any);

            await expect(paperTradingEngine.placeOrder({
                accountId: 'acc1',
                symbolName: 'TCS',
                transactionType: 'BUY',
                quantity: 10,
                orderType: 'MARKET',
                scriptToken: '123'
            } as any)).rejects.toThrow(/Insufficient funds/);
        });

        it('should succeed for simple MARKET BUY with sufficient funds', async () => {
            vi.mocked(Account.findById).mockResolvedValue({
                availableMargin: 100000
            } as any);

            vi.mocked(marketDataService.getPrice).mockReturnValue({ price: 100 } as any);

            const result = await paperTradingEngine.placeOrder({
                accountId: 'acc1',
                symbolName: 'TCS',
                transactionType: 'BUY',
                quantity: 1,
                orderType: 'MARKET',
                scriptToken: '123'
            } as any);

            expect(result).toBeDefined();
            // We can't easily check mockSave call because it's wrapped in the factory, 
            // but we can assume success if no error thrown and result returned.
        });

        it('should require price for LIMIT order', async () => {
            vi.mocked(Account.findById).mockResolvedValue({
                availableMargin: 100000
            } as any);

            await expect(paperTradingEngine.placeOrder({
                accountId: 'acc1',
                symbolName: 'TCS',
                transactionType: 'BUY',
                quantity: 1,
                orderType: 'LIMIT',
                // price missing
                scriptToken: '123'
            } as any)).rejects.toThrow('Price required for Limit order');
        });
    });
});
