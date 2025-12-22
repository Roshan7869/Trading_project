'use client';

import { useState, useEffect } from 'react';
import {
    AlertCircle,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Loader2,
    X,
    Info,
    Shield,
    Clock,
    Zap
} from 'lucide-react';

// Order Types
type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT';
type ProductType = 'MIS' | 'CNC' | 'NRML';
type ValidityType = 'DAY' | 'IOC' | 'GTC';

interface OrderConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    symbol: string;
    symbolName?: string;
    exchange?: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalAmount: number;
    holdings?: number;
    orderType?: OrderType;
    productType?: ProductType;
    validity?: ValidityType;
    triggerPrice?: number;
    availableBalance?: number;
    marketPrice?: number;
    change?: number;
    changePercent?: number;
}

const ORDER_TYPE_INFO: Record<OrderType, { label: string; description: string }> = {
    'MARKET': { label: 'Market Order', description: 'Execute immediately at current market price' },
    'LIMIT': { label: 'Limit Order', description: 'Execute only at specified price or better' },
    'STOP_LOSS': { label: 'Stop Loss', description: 'Trigger when price reaches stop level' },
    'STOP_LOSS_LIMIT': { label: 'Stop Loss Limit', description: 'Limit order with a trigger price' }
};

const PRODUCT_TYPE_INFO: Record<ProductType, { label: string; description: string; color: string }> = {
    'MIS': { label: 'Intraday', description: 'Squared off same day', color: 'bg-blue-500' },
    'CNC': { label: 'Delivery', description: 'Hold in demat', color: 'bg-green-500' },
    'NRML': { label: 'Normal', description: 'F&O positions', color: 'bg-purple-500' }
};

export default function OrderConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    symbol = '',
    symbolName = '',
    exchange = 'NSE',
    side = 'BUY',
    quantity = 0,
    price = 0,
    totalAmount = 0,
    holdings = 0,
    orderType = 'MARKET',
    productType = 'MIS',
    validity = 'DAY',
    triggerPrice,
    availableBalance = 100000,
    marketPrice,
    change = 0,
    changePercent = 0,
}: OrderConfirmationProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsConfirmed(false);
            setIsConfirming(false);
            setCountdown(3);
        } else {
            setIsConfirmed(false);
        }
    }, [isOpen]);

    // Countdown after success
    useEffect(() => {
        if (isConfirmed && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isConfirmed && countdown === 0) {
            onClose();
        }
    }, [isConfirmed, countdown, onClose]);

    // Safe values
    const safePrice = price ?? 0;
    const safeTotal = totalAmount ?? 0;
    const safeQuantity = quantity ?? 0;
    const safeMarketPrice = marketPrice ?? safePrice;

    // Validations
    const isRisky = side === 'BUY' && safeTotal > 50000;
    const insufficientHoldings = side === 'SELL' && safeQuantity > holdings;
    const insufficientBalance = side === 'BUY' && safeTotal > availableBalance;
    const priceDeviation = orderType === 'LIMIT' && Math.abs((safePrice - safeMarketPrice) / safeMarketPrice) > 0.05;

    const handleConfirm = async () => {
        try {
            setIsConfirming(true);
            await onConfirm();
            setIsConfirmed(true);
        } catch (error) {
            setIsConfirming(false);
        }
    };

    if (!isOpen) return null;

    const isBuy = side === 'BUY';
    const accentColor = isBuy ? 'emerald' : 'red';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Full width on mobile, centered on desktop */}
            <div className={`
                relative w-full sm:max-w-md mx-0 sm:mx-4
                bg-white dark:bg-gray-900 
                rounded-t-3xl sm:rounded-2xl
                shadow-2xl
                max-h-[90vh] overflow-hidden
                animate-in slide-in-from-bottom sm:zoom-in-95 duration-300
            `}>
                {/* Success State */}
                {isConfirmed ? (
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12">
                            <div className={`
                                w-20 h-20 sm:w-24 sm:h-24 rounded-full 
                                ${isBuy ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}
                                flex items-center justify-center mb-6
                                animate-in zoom-in-50 duration-500
                            `}>
                                <CheckCircle className={`w-10 h-10 sm:w-12 sm:h-12 ${isBuy ? 'text-emerald-500' : 'text-red-500'}`} />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Order Placed Successfully!
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                Your {side.toLowerCase()} order for {safeQuantity} {symbol} has been sent.
                            </p>
                            <div className={`
                                inline-flex items-center gap-2 px-4 py-2 rounded-full
                                ${isBuy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
                                dark:bg-opacity-20 font-medium
                            `}>
                                <Zap className="w-4 h-4" />
                                Closing in {countdown}s
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className={`
                            relative px-4 sm:px-6 py-4 
                            border-b border-gray-200 dark:border-gray-700
                            bg-gradient-to-r ${isBuy ? 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20' : 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'}
                        `}>
                            {/* Mobile Handle */}
                            <div className="sm:hidden w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        p-2.5 rounded-xl
                                        ${isBuy ? 'bg-emerald-500' : 'bg-red-500'}
                                    `}>
                                        {isBuy ?
                                            <TrendingUp className="w-5 h-5 text-white" /> :
                                            <TrendingDown className="w-5 h-5 text-white" />
                                        }
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            Confirm {side} Order
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Review before placing
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Stock Info Card */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                        {symbol.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{symbol}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {symbolName || exchange}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        ₹{safeMarketPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                    {change !== 0 && (
                                        <p className={`text-sm font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{safeQuantity}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {orderType === 'MARKET' ? 'Est. Price' : 'Limit Price'}
                                    </p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                                        ₹{safePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Order Type & Product Type */}
                            <div className="flex flex-wrap gap-2">
                                <span className={`
                                    px-3 py-1.5 rounded-full text-xs font-medium
                                    bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                                `}>
                                    {ORDER_TYPE_INFO[orderType].label}
                                </span>
                                <span className={`
                                    px-3 py-1.5 rounded-full text-xs font-medium text-white
                                    ${PRODUCT_TYPE_INFO[productType].color}
                                `}>
                                    {PRODUCT_TYPE_INFO[productType].label}
                                </span>
                                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {validity}
                                </span>
                            </div>

                            {/* Trigger Price (for Stop Loss orders) */}
                            {(orderType === 'STOP_LOSS' || orderType === 'STOP_LOSS_LIMIT') && triggerPrice && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                        <Info className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            Trigger Price: ₹{triggerPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Total Amount - Highlighted */}
                            <div className={`
                                p-4 rounded-xl border-2
                                ${isBuy ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}
                            `}>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Total Amount</span>
                                    <span className={`text-2xl font-bold ${isBuy ? 'text-emerald-600' : 'text-red-600'}`}>
                                        ₹{safeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {isBuy && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Available: ₹{availableBalance.toLocaleString('en-IN')}
                                    </p>
                                )}
                            </div>

                            {/* Warnings */}
                            <div className="space-y-2">
                                {insufficientHoldings && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Insufficient Holdings</p>
                                            <p className="text-xs text-red-600 dark:text-red-500">
                                                You have {holdings} shares. Order requires {safeQuantity}.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {insufficientBalance && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Insufficient Balance</p>
                                            <p className="text-xs text-red-600 dark:text-red-500">
                                                Required: ₹{safeTotal.toLocaleString('en-IN')} | Available: ₹{availableBalance.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isRisky && !insufficientBalance && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">High-Value Trade</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-500">
                                                Please verify all details carefully before confirming.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {priceDeviation && (
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Price Deviation</p>
                                            <p className="text-xs text-blue-600 dark:text-blue-500">
                                                Your limit price differs more than 5% from market price.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Security Notice */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Shield className="w-4 h-4" />
                                <span>Paper trading mode - No real money involved</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isConfirming}
                                    className="
                                        flex-1 px-6 py-3.5 
                                        bg-gray-200 dark:bg-gray-700 
                                        hover:bg-gray-300 dark:hover:bg-gray-600
                                        text-gray-700 dark:text-gray-200 
                                        font-semibold rounded-xl 
                                        transition-colors
                                        order-2 sm:order-1
                                    "
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isConfirming || insufficientHoldings || insufficientBalance}
                                    className={`
                                        flex-1 px-6 py-3.5 
                                        text-white font-semibold rounded-xl 
                                        transition-all
                                        flex items-center justify-center gap-2
                                        order-1 sm:order-2
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        ${isBuy
                                            ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
                                            : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                                        }
                                    `}
                                >
                                    {isConfirming ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {isBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            Confirm {side}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
