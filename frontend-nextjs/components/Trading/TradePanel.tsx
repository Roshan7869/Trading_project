'use client';

import React, { useState, useEffect } from 'react';
import { useTradePanel } from '@/context/TradePanelContext';
import { useMarket } from '@/context/MarketContext';
import { orderAPI } from '@/lib/api';
import { X, ArrowLeft, Wallet, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function TradePanel() {
    const { isOpen, symbol, side: initialSide, closeTradePanel } = useTradePanel();
    const { marketData, walletBalance, refreshPortfolio } = useMarket();

    const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [quantity, setQuantity] = useState<number>(1);
    const [limitPrice, setLimitPrice] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const stockData = symbol ? marketData.get(symbol) : null;
    const currentPrice = stockData?.price || 0;
    const priceChange = stockData?.change || 0;
    const isPositive = priceChange >= 0;

    // Reset state when panel opens
    useEffect(() => {
        if (isOpen) {
            setStep('INPUT');
            if (initialSide) setSide(initialSide);
            setQuantity(1);
            setOrderType('MARKET');
            setLimitPrice(currentPrice > 0 ? currentPrice : 0);
        }
    }, [isOpen, initialSide]); // Only reset on open, not every price update

    // Initialize limit price if 0 and currentPrice loads
    useEffect(() => {
        if (isOpen && limitPrice === 0 && currentPrice > 0 && orderType === 'MARKET') {
            setLimitPrice(currentPrice);
        }
    }, [currentPrice, isOpen]);


    // Determine effective price for calculation
    const effectivePrice = orderType === 'LIMIT' ? limitPrice : currentPrice;

    // Safety for Market Buy calculation: Buffer 0% (Simulating instant fill)
    // Real apps might buffer 1-2% for market orders, but we'll stick to exact
    const estimatedValue = effectivePrice * quantity;
    const hasInsufficientFunds = side === 'BUY' && estimatedValue > walletBalance;

    const handleQuantityChange = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num >= 0) {
            setQuantity(num);
        } else if (val === '') {
            setQuantity(0);
        }
    };

    const handlePriceChange = (val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            setLimitPrice(num);
        } else if (val === '') {
            setLimitPrice(0);
        }
    };

    const handleReviewOrder = () => {
        if (!symbol || quantity <= 0) {
            toast.error('Invalid quantity');
            return;
        }

        if (orderType === 'LIMIT' && limitPrice <= 0) {
            toast.error('Invalid limit price');
            return;
        }

        if (side === 'BUY' && hasInsufficientFunds) {
            toast.error('Insufficient funds');
            return;
        }
        setStep('REVIEW');
    };

    const handleConfirmOrder = async () => {
        setLoading(true);
        try {
            await orderAPI.placeOrder({
                symbol,
                type: side,
                quantity,
                price: effectivePrice,
                orderType: orderType
            });
            toast.success(`${orderType} ${side} Order placed for ${quantity} shares of ${symbol}`);
            refreshPortfolio();
            closeTradePanel();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Order failed');
            setStep('INPUT');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    const formatCurrency = (val: number) =>
        val.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={closeTradePanel}
            ></div>

            {/* Panel */}
            <div className={`relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center">
                        {step === 'REVIEW' && (
                            <button
                                onClick={() => setStep('INPUT')}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-sm font-semibold flex items-center ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatCurrency(currentPrice)}
                                    <span className="ml-1 text-xs">({priceChange.toFixed(2)}%)</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={closeTradePanel}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {step === 'INPUT' ? (
                        <>
                            {/* Side Toggle & Order Type */}
                            <div className="space-y-4">
                                <div className="bg-gray-100 p-1 rounded-xl flex">
                                    <button
                                        onClick={() => setSide('BUY')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-200 ${side === 'BUY'
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        BUY
                                    </button>
                                    <button
                                        onClick={() => setSide('SELL')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-200 ${side === 'SELL'
                                            ? 'bg-rose-500 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        SELL
                                    </button>
                                </div>

                                <div className="flex rounded-md shadow-sm border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => setOrderType('MARKET')}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === 'MARKET' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Market
                                    </button>
                                    <button
                                        onClick={() => setOrderType('LIMIT')}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === 'LIMIT' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Limit
                                    </button>
                                </div>
                            </div>

                            {/* Input Form */}
                            <div className="space-y-6">
                                {/* Quantity */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">Quantity</label>
                                        <span className="text-xs text-gray-500">Lot: 1</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            value={quantity || ''}
                                            onChange={(e) => handleQuantityChange(e.target.value)}
                                            className={`w-full text-2xl font-semibold px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${side === 'BUY'
                                                ? 'border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/10'
                                                : 'border-rose-100 focus:border-rose-500 focus:ring-rose-500/10'
                                                }`}
                                            placeholder="0"
                                        />
                                        <div className="absolute right-2 top-2 flex gap-1">
                                            {[1, 5, 10, 50].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setQuantity(n)}
                                                    className="px-2 py-1 text-xs font-semibold bg-gray-50 hover:bg-gray-200 text-gray-600 rounded-md transition"
                                                >
                                                    +{n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Input (Based on Order Type) */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        {orderType === 'LIMIT' ? 'Limit Price' : 'Market Price'}
                                    </label>

                                    {orderType === 'LIMIT' ? (
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={limitPrice || ''}
                                            onChange={(e) => handlePriceChange(e.target.value)}
                                            className="w-full text-2xl font-semibold px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                            placeholder="Price"
                                        />
                                    ) : (
                                        <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center text-gray-500 cursor-not-allowed">
                                            <span className="text-lg font-medium">At Market</span>
                                            <span className="text-sm">~ {formatCurrency(currentPrice)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Summary Card */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-700">Estimated Value</span>
                                        <span className="text-xl font-bold text-gray-900">
                                            {formatCurrency(estimatedValue)}
                                        </span>
                                    </div>
                                </div>

                                {/* Margin Info */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wallet className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Available Margin</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {formatCurrency(walletBalance)}
                                            </p>
                                            {side === 'BUY' && (
                                                <p className={`text-xs mt-1 ${hasInsufficientFunds ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                                                    {hasInsufficientFunds
                                                        ? `Short by ${formatCurrency(estimatedValue - walletBalance)}`
                                                        : `Balance after trade: ~${formatCurrency(walletBalance - estimatedValue)}`
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Review Step UI
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-gray-50 p-6 rounded-2xl border space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b">
                                    <span className="text-gray-600">Order Header</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${side === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {side} {orderType}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Shares</span>
                                    <span className="font-semibold text-gray-900">{quantity}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Price Type</span>
                                    <span className="font-medium text-gray-900">
                                        {orderType === 'LIMIT' ? formatCurrency(limitPrice) : 'Market Price'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Brokerage</span>
                                    <span className="font-medium text-emerald-600">Free</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600">Total Payable</span>
                                    <Info className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900 text-right">
                                    {formatCurrency(estimatedValue)}
                                </p>
                                <p className="text-xs text-gray-500 text-right mt-1">
                                    Available: {formatCurrency(walletBalance)}
                                </p>
                            </div>

                            {side === 'BUY' && hasInsufficientFunds && (
                                <div className="p-3 rounded-lg bg-rose-100 text-rose-700 text-sm font-medium text-center">
                                    Insufficient funds. Please reduce quantity.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50/50">
                    {step === 'INPUT' ? (
                        <button
                            onClick={handleReviewOrder}
                            disabled={loading || (side === 'BUY' && hasInsufficientFunds) || quantity <= 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform active:scale-95 ${side === 'BUY'
                                ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
                                : 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300'
                                }`}
                        >
                            {side} {symbol}
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirmOrder}
                            disabled={loading || (side === 'BUY' && hasInsufficientFunds)}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${side === 'BUY'
                                ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
                                : 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300'
                                }`}
                        >
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                `CONFIRM ${side}`
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
