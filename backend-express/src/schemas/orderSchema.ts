import { z } from 'zod';

export const simpleOrderSchema = z.object({
    body: z.object({
        symbol: z.string().min(1, 'Symbol is required').uppercase(),
        type: z.enum(['BUY', 'SELL']),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        price: z.number().positive('Price must be positive').optional(),
        orderType: z.enum(['MARKET', 'LIMIT']).optional().default('MARKET'),
    }),
});
