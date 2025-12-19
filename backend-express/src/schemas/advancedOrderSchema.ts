import { z } from 'zod';

export const advancedOrderSchema = z.object({
    body: z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        scriptToken: z.string().min(1, 'Script Token is required'),
        symbolName: z.string().min(1).toUpperCase(),
        exchange: z.enum(['NSE', 'BSE']),
        orderType: z.enum(['MARKET', 'LIMIT', 'SL', 'SL-M']),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        price: z.number().positive('Price must be positive').optional(),
        triggerPrice: z.number().positive().optional(),
        transactionType: z.enum(['BUY', 'SELL']),
        productType: z.enum(['CNC', 'MIS', 'NRML']),
        validity: z.enum(['DAY', 'IOC', 'GTC']),
    }),
});
