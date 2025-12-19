import Account from '../models/Account';
import Order from '../models/Order';
import { AppError } from './AppError';
import { StatusCodes } from 'http-status-codes';

/**
 * Asserts that the given account belongs to the user
 */
export const assertAccountOwnership = async (userId: string, accountId: string) => {
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
        throw new AppError('Account not found or access denied', StatusCodes.FORBIDDEN);
    }
    return account;
};

/**
 * Asserts that the given order belongs to the user
 */
export const assertOrderOwnership = async (userId: string, orderId: string) => {
    const order = await Order.findById(orderId).populate('accountId');

    if (!order) {
        throw new AppError('Order not found', StatusCodes.NOT_FOUND);
    }

    // Since accountId is populated, we need to cast it to check the userId
    // Note: This assumes populate was successful. If account is deleted, this might fail, 
    // but in that case the order is effectively orphaned or invalid anyway.
    const account = order.accountId as any;

    if (!account || account.userId.toString() !== userId) {
        throw new AppError('Access denied', StatusCodes.FORBIDDEN);
    }

    return order;
};
