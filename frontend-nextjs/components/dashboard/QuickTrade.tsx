'use client';

import React, { useState } from 'react';
import OrderConfirmationModal from '@/components/OrderConfirmationModal';
import { orderAPI } from '@/lib/api';

interface MarketData {
    symbol: string;
    price: number;
    change: number;
}

interface QuickTradeProps {
    stocks: string[];
    marketData: Map<string, MarketData>;
    walletBalance: number;
    onOrderComplete: () => void;
}

export function QuickTrade({ stocks, marketData, walletBalance, onOrderComplete }: QuickTradeProps) {
    const [selectedStock, setSelectedStock] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderMessage, setOrderMessage] = useState('');
    const [orderModal, setOrderModal] = useState<{
        open: boolean;
        symbol?: string;
        action?: 'BUY' | 'SELL';
        quantity?: number;
        price?: number;
    }>({ open: false });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    const handleQuickTrade = () => {
        if (!selectedStock || quantity <= 0) {
            setOrderMessage('Please select a stock and enter valid quantity');
            return;
        }

        const stockData = marketData.get(selectedStock);
        const estimatedPrice = stockData ? stockData.price : 0;

        // Open confirmation modal
        setOrderModal({
            open: true,
            symbol: selectedStock,
            action: orderType,
            quantity: quantity,
            price: estimatedPrice
        });
    };

    const handleConfirmOrder = async () => {
        setOrderLoading(true);
        setOrderMessage('');
        setOrderModal({ ...orderModal, open: false }); // Close modal immediately

        try {
            const response = await orderAPI.placeOrder({
                symbol: orderModal.symbol!,
                type: orderModal.action!,
                quantity: orderModal.quantity!
            });

            if (response.data.success) {
                setOrderMessage(`✅ ${response.data.message}`);
                onOrderComplete(); // Refresh portfolio in parent
                setQuantity(1);
            } else {
                setOrderMessage(`❌ ${response.data.message}`);
            }
        } catch (error: any) {
            setOrderMessage(`❌ ${error.response?.data?.message || 'Order failed'}`);
        } finally {
            setOrderLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <h2 className="text-lg font-semibold mb-4">Quick Trade</h2>

            <div className="space-y-4">
                {/* Stock Selection */}
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Select Stock</label>
                    <select
                        value={selectedStock}
                        onChange={(e) => setSelectedStock(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Choose a stock</option>
                        {stocks.map(stock => {
                            const data = marketData.get(stock);
                            return (
                                <option key={stock} value={stock}>
                                    {stock} - {data ? `₹${data.price.toFixed(2)}` : 'Loading...'}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Order Type Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setOrderType('BUY')}
                        className={`flex-1 py-2 rounded-lg font-medium transition ${orderType === 'BUY'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setOrderType('SELL')}
                        className={`flex-1 py-2 rounded-lg font-medium transition ${orderType === 'SELL'
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        SELL
                    </button>
                </div>

                {/* Estimated Value */}
                {selectedStock && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Estimated Value</p>
                        <p className="text-lg font-semibold">
                            {formatCurrency((marketData.get(selectedStock)?.price || 0) * quantity)}
                        </p>
                    </div>
                )}

                {/* Place Order Button */}
                <button
                    onClick={handleQuickTrade}
                    disabled={orderLoading || !selectedStock}
                    className={`w-full py-3 rounded-lg font-medium text-white transition ${orderType === 'BUY'
                        ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
                        : 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300'
                        }`}
                >
                    {orderLoading ? 'Processing...' : `Place ${orderType} Order`}
                </button>

                {/* Order Message */}
                {orderMessage && (
                    <p className={`text-sm text-center ${orderMessage.includes('✅') ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {orderMessage}
                    </p>
                )}
            </div>

            <OrderConfirmationModal
                isOpen={orderModal.open}
                onClose={() => setOrderModal({ ...orderModal, open: false })}
                onConfirm={handleConfirmOrder}
                symbol={orderModal.symbol!}
                side={orderModal.action!}
                quantity={orderModal.quantity!}
                price={orderModal.price!}
                totalAmount={(orderModal.quantity || 0) * (orderModal.price || 0)}
                availableBalance={walletBalance}
                marketPrice={orderModal.price}
                change={marketData.get(orderModal.symbol || '')?.change || 0}
                changePercent={marketData.get(orderModal.symbol || '')?.change || 0}
            />
        </div>
    );
}
