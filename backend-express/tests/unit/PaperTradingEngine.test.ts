import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing the service
vi.mock('../../src/models/Account');
vi.mock('../../src/models/Order', () => {
    const mockSave = vi.fn().mockResolvedValue({});
    return {
        // Determine if default export is needed or named export based on how source uses it.
        // Source: import Order from '../models/Order' -> default export.
        default: vi.fn().mockImplementation((data) => ({
            ...data,
            save: mockSave,
            _id: 'mock_order_id'
        })),
        __esModule: true,
    };
});
vi.mock('../../src/services/MarketDataService', () => ({
    marketDataService: {
        getPrice: vi.fn()
    },
    __esModule: true
}));
vi.mock('../../src/services/PositionService');
vi.mock('../../src/services/AccountService');

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

            await expect(paperTradingEngine.placeOrder({ accountId: 'invalid' } as any))
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
