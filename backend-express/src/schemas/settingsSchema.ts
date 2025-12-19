import { z } from 'zod';

export const saveBrokerSchema = z.object({
    body: z.object({
        broker: z.enum(['ANGEL_ONE', 'KOTAK_NEO', 'ZERODHA']),
        // Dynamic fields based on broker, validation handled in controller for specifics
        // but we can ensure they are strings if present
        apiKey: z.string().optional(),
        clientCode: z.string().optional(),
        pin: z.string().optional(),
        totpSecret: z.string().optional(),
        consumerKey: z.string().optional(),
        consumerSecret: z.string().optional(),
        mobileNumber: z.string().optional(),
        password: z.string().optional(),
        apiSecret: z.string().optional(),
        userId: z.string().optional(),
    }).strict(), // disallow unknown keys to prevent pollution
});
