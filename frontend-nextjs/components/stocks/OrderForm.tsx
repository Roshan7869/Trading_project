'use client';

import { useState } from 'react';
import { orderAPI } from '@/lib/api';
import { toast } from 'sonner';
import OrderConfirmationModal from '@/components/OrderConfirmationModal';

interface OrderFormProps {
    symbol: string;
    price: number;
    change: number;
    holdings: number;
    walletBalance: number;
    onOrderSuccess: () => void;
}

export default function OrderForm({
    symbol,
    price,
    change,
    holdings,
    walletBalance,
    onOrderSuccess
}: OrderFormProps) {
    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
    const [quantity, setQuantity] = useState(1);
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const totalAmount = price * quantity;

    const handleInitialSubmit = () => {
        if (!price) {
            toast.error('Waiting for market price...');
            return;
        }

        if (orderType === 'BUY' && walletBalance < totalAmount) {
            toast.error('Insufficient wallet balance');
            return;
        }

        if (orderType === 'SELL' && holdings < quantity) {
            toast.error('Insufficient holdings to sell');
            return;
        }

        setConfirmationOpen(true);
    };

    const executeOrder = async () => {
        try {
            await orderAPI.placeOrder({
                symbol,
                type: orderType,
                quantity,
                price,
            });

            toast.success(`${orderType} order placed successfully!`);
            onOrderSuccess();
            setQuantity(1);
        } catch (err: any) {
            const message = err.response?.data?.error || err.response?.data?.message || 'Order failed';
            toast.error(message);
            throw new Error(message);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Place Order</h2>

            {/* Order Type Toggle */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setOrderType('BUY')}
                    className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'BUY'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-secondary text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    BUY
                </button>
                <button
                    onClick={() => setOrderType('SELL')}
                    className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'SELL'
                        ? 'bg-danger text-white shadow-lg shadow-danger/30'
                        : 'bg-secondary text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    SELL
                </button>
            </div>

            {/* Quantity Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                </label>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
            </div>

            {/* Price Display */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per share
                </label>
                <div className="px-4 py-3 bg-secondary rounded-xl">
                    <p className="text-xl font-bold text-gray-900">
                        ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Total Amount */}
            <div className="mb-6 p-4 bg-secondary rounded-xl border border-gray-200">
                <p className="text-gray-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                    ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
            </div>

            {/* Place Order Button */}
            <button
                onClick={handleInitialSubmit}
                disabled={!price}
                className={`w-full py-4 rounded-full font-semibold text-white transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${orderType === 'BUY'
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25'
                    : 'bg-danger hover:bg-danger/90 shadow-lg shadow-danger/25'
                    }`}
            >
                {orderType} {quantity} Share{quantity > 1 ? 's' : ''}
            </button>

            {/* Wallet Info */}
            <div className="mt-4 text-center text-sm text-gray-500">
                Available: ₹{(walletBalance || 0).toLocaleString('en-IN')}
            </div>

            <OrderConfirmationModal
                isOpen={confirmationOpen}
                onClose={() => setConfirmationOpen(false)}
                onConfirm={executeOrder}
                symbol={symbol}
                side={orderType}
                quantity={quantity}
                price={price}
                totalAmount={totalAmount}
                holdings={holdings}
                availableBalance={walletBalance}
                marketPrice={price}
                change={change} // Prop passed through
                changePercent={change}
            />
        </div>
    );
}
